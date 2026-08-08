#!/usr/bin/env node
// =============================================================================
// check-schema-drift.mjs
// -----------------------------------------------------------------------------
// Answers the question: "are the migrations in this repo actually what's
// running in production?"
//
// Compares a lightweight "expected schema" model parsed from the migration
// files on disk against the LIVE Postgres database reached via DATABASE_URL.
//
// SCOPE
//   - supabase/migrations/*.sql (numbered 001..056), processed in filename order
//   - supabase/schema.sql (repo base schema) — included because the runbook
//     (ARCHITECTURE.md §2.6) lists it as migration order 0. Pass --exclude-schema
//     to skip it. Loose root scratch files (035_ddl_small.sql,
//     pending_migrations_033_036.sql) are intentionally OUT of scope: they are
//     not referenced by the runbook.
//
// DRIFT CLASSES DETECTED
//   1. Tables in migrations but MISSING in live
//   2. Tables in live but NOT in migrations
//   3. Per-table column drift: columns missing on either side + TYPE MISMATCHES
//      (e.g. analytics_categories.id: expected uuid got bigint)
//   4. PRIMARY KEY type drift (surfaces the serial-vs-uuid class): for each PK
//      column, live type vs the type declared by the NEWEST migration that
//      creates/adds it
//   5. RLS drift: migration says ENABLE ROW LEVEL SECURITY but live has
//      relrowsecurity=false (and the reverse)
//   6. Policy drift: expected policies (surviving all DROP POLICYs) missing in
//      live; tables with 0 live policies but expected policies
//   7. Unique constraint drift: expected unique key (column list) missing in live
//
// PARSING NOTE — this is a deliberately lightweight, line-level, best-effort
// parser, NOT a full SQL parser. It understands the shapes actually used in
// this repo (CREATE TABLE / ALTER TABLE ADD COLUMN / ADD CONSTRAINT ... UNIQUE /
// CREATE UNIQUE INDEX / DROP TABLE / CREATE+DROP POLICY / ENABLE ROW LEVEL
// SECURITY). Anything it does not understand is silently ignored, so a clean
// report means "no drift in the constructs we know how to read", not an
// exhaustive proof of equivalence.
//
// USAGE
//   DATABASE_URL='postgres://user:pass@host:5432/db' node scripts/check-schema-drift.mjs
//   node scripts/check-schema-drift.mjs --db='postgres://...'   # supabase pooler URL ok
//   node scripts/check-schema-drift.mjs --parse-only            # parse files, no DB
//   node scripts/check-schema-drift.mjs --exclude-schema       # drop supabase/schema.sql
//   node scripts/check-schema-drift.mjs --help
//
// EXIT CODES
//   0 = clean (no drift found in the constructs we parse)
//   1 = drift found  OR  DATABASE_URL missing
//   2 = infrastructure error (could not read files / connect to DB / missing pg)
//
// SECURITY: never prints the connection string, password, or row data.
// Only env var DATABASE_URL or the --db flag are read; .env files are never loaded.
// =============================================================================

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');
const SCHEMA_SQL = path.join(REPO_ROOT, 'supabase', 'schema.sql');
const RUNBOOK_SCHEMA_REF = 'ARCHITECTURE.md §2.6 (migration order 0)';

const CONNECT_TIMEOUT_MS = 10_000;
const STATEMENT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Type normalization
// ---------------------------------------------------------------------------
// Normalize a declared Postgres type to a comparison key so that equivalent
// spellings compare equal (serial vs integer, int vs integer, timestamptz vs
// timestamp with time zone, varchar vs text, ...) while genuinely different
// types stay different (uuid vs bigint — the serial-vs-uuid drift class).
//
// numeric keeps its precision suffix (numeric(15,2) != numeric(15,3)) and
// varchar keeps its length, both of which are real drift signals.

function familyOf(raw) {
  const t = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (/^(double precision|float8)$/.test(t)) return 'double precision';
  if (/^(real|float4)$/.test(t)) return 'real';
  if (/^(smallserial|serial2|int2|smallint)$/.test(t)) return 'smallint';
  if (/^(serial|serial4|int4|integer|int)$/.test(t)) return 'integer';
  if (/^(bigserial|serial8|int8|bigint)$/.test(t)) return 'bigint';
  if (/^(?:bigint|int8|bigserial|smallint|int2|smallserial|integer|int4|int|serial|serial4)\[\]$/.test(t)) {
    if (/^bigint|^int8|^bigserial/.test(t)) return 'bigint[]';
    if (/^smallint|^int2|^smallserial/.test(t)) return 'smallint[]';
    return 'integer[]';
  }
  if (/^(numeric|decimal)(\([^)]*\))?$/.test(t)) return 'numeric';
  if (/^(boolean|bool)$/.test(t)) return 'boolean';
  if (/^text$/.test(t)) return 'text';
  if (/^text\[\]$/.test(t)) return 'text[]';
  if (/^(character varying|varchar)(\([^)]*\))?$/.test(t)) return 'text';
  if (/^(character|char|bpchar)(\([^)]*\))?$/.test(t)) return 'text';
  if (/^jsonb$/.test(t)) return 'jsonb';
  if (/^json$/.test(t)) return 'json';
  if (/^uuid$/.test(t)) return 'uuid';
  if (/^(timestamp with time zone|timestamptz)$/.test(t)) return 'timestamptz';
  if (/^(timestamp without time zone|timestamp)$/.test(t)) return 'timestamp';
  if (/^(time with time zone|timetz)$/.test(t)) return 'timetz';
  if (/^(time without time zone|time)$/.test(t)) return 'time';
  if (/^date$/.test(t)) return 'date';
  if (/^interval$/.test(t)) return 'interval';
  if (/^bytea$/.test(t)) return 'bytea';
  if (/^inet$/.test(t)) return 'inet';
  if (/^cidr$/.test(t)) return 'cidr';
  return t; // unknown / custom: compare by exact normalized spelling
}

// Comparison key. numeric and varchar carry their precision/length so subtle
// drift (numeric(15,2) -> numeric(15,3)) is caught, not just family drift.
function compareType(raw) {
  const t = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  const fam = familyOf(t);
  if (fam === 'numeric') {
    const m = t.match(/^numeric\((\d+)\s*,\s*(\d+)\)$/);
    if (m) return `numeric(${m[1]},${m[2]})`;
    const p = t.match(/^numeric\((\d+)\)$/);
    if (p) return `numeric(${p[1]})`;
    return 'numeric';
  }
  if (fam === 'text') {
    const v = t.match(/^(?:character varying|varchar)\((\d+)\)$/);
    if (v) return `varchar(${v[1]})`;
    return 'text';
  }
  return fam;
}

// ---------------------------------------------------------------------------
// Regexes (line-level, best-effort)
// ---------------------------------------------------------------------------

// Ordered so longer/tighter alternatives win (timestamptz before timestamp,
// integer before int, interval/inet before int, tz forms before bare forms).
const TYPE_ONE =
  '(?:' +
  'double\\s+precision|' +
  'character\\s+varying|' +
  'timestamp\\s+with\\s+time\\s+zone|' +
  'timestamp\\s+without\\s+time\\s+zone|' +
  'time\\s+with\\s+time\\s+zone|' +
  'time\\s+without\\s+time\\s+zone|' +
  'timestamptz|timetz|timestamp|time|' +
  'bigserial|smallserial|bigint|smallint|integer|interval|inet|' +
  'int8|int4|int2|int|serial|' +
  'numeric|decimal|real|float8|float4|boolean|bool|' +
  'text|varchar|character|char|bpchar|name|' +
  'uuid|jsonb|json|date|bytea|cidr|macaddr|money|oid|xml|tsvector|tsquery' +
  ')';

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/i;
const DROP_TABLE_RE = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*;?/i;
const ALTER_TABLE_RE = /^\s*ALTER\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/i;
const ADD_COL_RE = new RegExp(
  'ADD\\s+COLUMN\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([a-z_][a-z0-9_]*)\\s+(' + TYPE_ONE +
  ')(?:\\s*\\([^)]*\\))?\\s*(\\[\\])?(\\s+.*)?$',
  'ig'
);
const ALTER_COL_TYPE_RE = new RegExp(
  'ALTER\\s+COLUMN\\s+([a-z_][a-z0-9_]*)\\s+TYPE\\s+(' + TYPE_ONE +
  ')(?:\\s*\\([^)]*\\))?\\s*(\\[\\])?',
  'i'
);
const ADD_PK_RE = /ADD\s+(?:CONSTRAINT\s+(?:"([^"]+)"|[a-z_][a-z0-9_]*)\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i;
const ADD_UNIQUE_RE = /ADD\s+CONSTRAINT\s+(?:"([^"]+)"|[a-z_][a-z0-9_]*)\s+UNIQUE\s*\(([^)]+)\)/i;
const DROP_CONSTRAINT_RE = /DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?(?:"([^"]+)"|[a-z_][a-z0-9_]*)/i;
const RLS_RE = /\b(ENABLE|DISABLE)\s+ROW\s+LEVEL\s+SECURITY/i;
const CREATE_POLICY_RE = /CREATE\s+POLICY\s+(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)/i;
const DROP_POLICY_RE = /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)/i;
const UNIQUE_INDEX_RE = /CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|[a-z_][a-z0-9_]*)\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+(?:USING\s+[a-z0-9_]+\s+)?\(([^)]+)\)/i;
const TABLE_LEVEL_UNIQUE_RE = /(?:^|,)\s*(?:CONSTRAINT\s+(?:"([^"]+)"|[a-z_][a-z0-9_]*)\s+)?UNIQUE\s*\(([^)]+)\)/i;
const TABLE_LEVEL_PK_RE = /(?:^|,)\s*(?:CONSTRAINT\s+(?:"([^"]+)"|[a-z_][a-z0-9_]*)\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i;

// Constraint-looking lines inside a CREATE TABLE block that are NOT columns.
const TABLE_LEVEL_GUARD = /^\s*(UNIQUE|PRIMARY|FOREIGN|CONSTRAINT|CHECK|EXCLUDE|REFERENCES|LIKE)\b/i;

// Note: the trailing group allows the rest of the line to start with
// whitespace OR a comma/semicolon, so bare columns like "description text,"
// (no space before the comma) still parse.
const COL_RE = new RegExp(
  '^\\s*([a-z_][a-z0-9_]*)\\s+(' + TYPE_ONE +
  ')(?:\\s*\\([^)]*\\))?\\s*(\\[\\])?((?:\\s|,|;).*)?$',
  'i'
);

// ---------------------------------------------------------------------------
// Expected model
// ---------------------------------------------------------------------------

function newTable(name) {
  return {
    name,
    columns: new Map(),      // col -> { type, cmp, source }
    pkCols: [],              // [col, ...] from newest PRIMARY KEY declaration
    pkSource: null,
    rls: false,              // final expected state after sequential ENABLE/DISABLE
    rlsSource: null,
    policies: new Map(),     // policyName -> source
    uniques: [],             // [{ cols, name?, source }]
    createdBy: null,         // first file:line that created it
  };
}

class ExpectedModel {
  constructor() {
    this.tables = new Map(); // tableName -> table model (in filename order)
  }

  table(name) {
    let t = this.tables.get(name);
    if (!t) {
      t = newTable(name);
      this.tables.set(name, t);
    }
    return t;
  }

  removeTable(name) {
    this.tables.delete(name);
  }

  setColumn(tableName, col, rawType, source) {
    const t = this.table(tableName);
    t.columns.set(col, { type: rawType, cmp: compareType(rawType), source });
  }

  setPk(tableName, cols, source) {
    const t = this.table(tableName);
    t.pkCols = cols;
    t.pkSource = source;
  }

  setRls(tableName, enabled, source) {
    const t = this.table(tableName);
    t.rls = enabled;
    t.rlsSource = source;
  }

  addPolicy(tableName, policyName, source) {
    this.table(tableName).policies.set(policyName, source);
  }

  dropPolicy(tableName, policyName) {
    const t = this.tables.get(tableName);
    if (t) t.policies.delete(policyName);
  }

  addUnique(tableName, cols, source, name = null) {
    this.table(tableName).uniques.push({ cols, name, source });
  }

  dropConstraint(tableName, name) {
    const t = this.tables.get(tableName);
    if (!t) return;
    t.uniques = t.uniques.filter((u) => u.name !== name);
  }
}

function parseIdentList(list) {
  return list
    .split(',')
    .map((s) => {
      const m = s.match(/([a-z_][a-z0-9_]*)/i);
      return m ? m[1] : s.trim();
    })
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

function extractUniqueColsFromIndex(list) {
  // index column list may include opclasses / sort order: strip them.
  return list
    .split(',')
    .map((s) => {
      const m = s.match(/([a-z_][a-z0-9_]*)/i);
      return m ? m[1] : s.trim();
    })
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

/**
 * Build the expected schema model by sequentially "replaying" the SQL files.
 * Last write wins, so later migrations override earlier ones and DROP TABLE /
 * DROP POLICY / DROP CONSTRAINT actually remove things.
 */
export function buildExpectedModel({ includeSchema = true } = {}) {
  const model = new ExpectedModel();

  const files = [];
  if (includeSchema) {
    if (existsSync(SCHEMA_SQL)) {
      files.push({ label: path.relative(REPO_ROOT, SCHEMA_SQL), abs: SCHEMA_SQL });
    } else {
      throw new Error(
        `Runbook references ${SCHEMA_SQL} as migration order 0, but the file does not exist. ` +
        `Pass --exclude-schema to skip it.`
      );
    }
  }
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of migrationFiles) {
    files.push({ label: path.join('supabase', 'migrations', f), abs: path.join(MIGRATIONS_DIR, f) });
  }

  for (const file of files) {
    const lines = readFileSync(file.abs, 'utf8').split('\n');

    let currentTable = null;      // inside CREATE TABLE block
    let currentAlterTable = null; // last ALTER TABLE target
    let blockTableWasDropped = false; // table was dropped earlier in the same file
    const droppedInFile = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const src = `${file.label}:${i + 1}`;

      // --- CREATE TABLE --------------------------------------------------
      const createMatch = line.match(CREATE_TABLE_RE);
      if (createMatch) {
        currentTable = createMatch[1];
        currentAlterTable = null;
        blockTableWasDropped = droppedInFile.has(currentTable);

        // If this table was dropped earlier (DROP TABLE + rebuild pattern,
        // e.g. 012 analytics_fact_pricing, 045 analytics_fact_inventory), the
        // CREATE is a fresh build: replace the model. IF NOT EXISTS on a table
        // that was never dropped merges instead (additive, like Postgres).
        if (blockTableWasDropped) {
          model.removeTable(currentTable);
        }
        const t = model.table(currentTable);
        if (!t.createdBy) t.createdBy = src;

        // Close inline single-line block: CREATE TABLE x (...);
        const closeIdx = line.indexOf(')');
        const parenIdx = line.indexOf('(');
        if (closeIdx !== -1 && closeIdx < line.length - 1) {
          if (/^\s*\);?/.test(line.slice(closeIdx + 1)) || line.slice(closeIdx + 1).trim() === ';') {
            currentTable = null;
          }
        } else if (parenIdx !== -1) {
          // multi-line block: continue
        }
        continue;
      }

      // --- end of CREATE TABLE block --------------------------------------
      if (currentTable && /^\s*\)/.test(line)) {
        currentTable = null;
        continue;
      }

      // --- DROP TABLE ------------------------------------------------------
      const dropTable = line.match(DROP_TABLE_RE);
      if (dropTable) {
        model.removeTable(dropTable[1]);
        droppedInFile.add(dropTable[1]);
        currentTable = null;
        currentAlterTable = null;
        continue;
      }

      // --- lines inside a CREATE TABLE block ------------------------------
      if (currentTable) {
        if (/^\s*(--|$)/.test(line)) continue;

        if (TABLE_LEVEL_GUARD.test(line)) {
          const pk = line.match(TABLE_LEVEL_PK_RE);
          if (pk) {
            const cols = parseIdentList(pk[2]);
            model.setPk(currentTable, cols, src);
          }
          const uq = line.match(TABLE_LEVEL_UNIQUE_RE);
          if (uq) {
            const name = uq[1] || null;
            model.addUnique(currentTable, extractUniqueColsFromIndex(uq[2]), src, name);
          }
          continue;
        }

        const colMatch = line.match(COL_RE);
        if (colMatch) {
          const col = colMatch[1];
          const typeStr = colMatch[2] + (colMatch[3] || '');
          const rest = (colMatch[4] || '').toLowerCase();
          model.setColumn(currentTable, col, typeStr, src);
          if (/\bprimary\s+key\b/.test(rest)) {
            model.setPk(currentTable, [col], src);
          }
          if (/\bunique\b/.test(rest)) {
            model.addUnique(currentTable, [col], src);
          }
        }
        continue;
      }

      // --- ALTER TABLE (establishes currentAlterTable) ---------------------
      const alterMatch = line.match(ALTER_TABLE_RE);
      if (alterMatch) {
        currentAlterTable = alterMatch[1];
      }

      // --- RLS -------------------------------------------------------------
      const rlsMatch = line.match(RLS_RE);
      if (rlsMatch && currentAlterTable) {
        model.setRls(currentAlterTable, rlsMatch[1].toLowerCase() === 'enable', src);
      }

      // --- ADD COLUMN (multi-line ALTER continuations use currentAlterTable)
      for (const m of line.matchAll(ADD_COL_RE)) {
        if (!currentAlterTable) continue;
        const col = m[1];
        const typeStr = m[2] + (m[3] || '');
        model.setColumn(currentAlterTable, col, typeStr, src);
        const rest = (m[4] || '').toLowerCase();
        if (/\bunique\b/.test(rest)) {
          model.addUnique(currentAlterTable, [col], src);
        }
      }

      // --- ALTER COLUMN ... TYPE ------------------------------------------
      const alterColType = line.match(ALTER_COL_TYPE_RE);
      if (alterColType && currentAlterTable) {
        model.setColumn(currentAlterTable, alterColType[1], alterColType[2] + (alterColType[3] || ''), src);
      }

      // --- ADD CONSTRAINT ... PRIMARY KEY / UNIQUE -------------------------
      const addPk = line.match(ADD_PK_RE);
      if (addPk && currentAlterTable) {
        model.setPk(currentAlterTable, parseIdentList(addPk[2]), src);
      }
      const addUq = line.match(ADD_UNIQUE_RE);
      if (addUq && currentAlterTable) {
        model.addUnique(currentAlterTable, extractUniqueColsFromIndex(addUq[2]), src, addUq[1] || null);
      }

      // --- DROP CONSTRAINT -------------------------------------------------
      const dropCon = line.match(DROP_CONSTRAINT_RE);
      if (dropCon && currentAlterTable) {
        model.dropConstraint(currentAlterTable, dropCon[1] || dropCon[2]);
      }

      // --- CREATE UNIQUE INDEX / DROP UNIQUE INDEX -------------------------
      const uqIdx = line.match(UNIQUE_INDEX_RE);
      if (uqIdx) {
        model.addUnique(uqIdx[2], extractUniqueColsFromIndex(uqIdx[3]), src);
      }

      // --- policies --------------------------------------------------------
      const createPol = line.match(CREATE_POLICY_RE);
      if (createPol) {
        model.addPolicy(createPol[3], createPol[1] || createPol[2], src);
      }
      const dropPol = line.match(DROP_POLICY_RE);
      if (dropPol) {
        model.dropPolicy(dropPol[3], dropPol[1] || dropPol[2]);
      }
    }
  }

  return model;
}

// ---------------------------------------------------------------------------
// Live model
// ---------------------------------------------------------------------------

const LIVE_TABLES_SQL = `
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  ORDER BY c.relname`;

const LIVE_COLUMNS_SQL = `
  SELECT c.relname AS table_name, a.attname AS column_name,
         format_type(a.atttypid, a.atttypmod) AS full_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
    AND a.attnum > 0 AND NOT a.attisdropped
  ORDER BY c.relname, a.attnum`;

const LIVE_POLICIES_SQL = `
  SELECT tablename AS table_name, policyname AS policy_name
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname`;

const LIVE_CONSTRAINTS_SQL = `
  SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
         string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS cols
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
   AND tc.table_name = kcu.table_name
  WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('UNIQUE','PRIMARY KEY')
  GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
  ORDER BY tc.table_name, tc.constraint_name`;

const LIVE_UNIQUE_INDEXES_SQL = `
  SELECT tablename AS table_name, indexname AS index_name, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
  ORDER BY tablename, indexname`;

async function queryLiveModel(dbUrl) {
  let pg;
  try {
    pg = await import('pg');
  } catch (err) {
    throw new Error(
      "The 'pg' module is not available. It is declared in package.json, but a " +
      '`npm install` may be needed. Refusing to proceed without a driver.'
    );
  }
  const { Pool } = pg.default ?? pg;
  const pool = new Pool({
    connectionString: dbUrl,
    max: 5,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    application_name: 'check-schema-drift',
  });

  try {
    const [tablesRes, colsRes, polRes, conRes, idxRes] = await Promise.all([
      pool.query(LIVE_TABLES_SQL),
      pool.query(LIVE_COLUMNS_SQL),
      pool.query(LIVE_POLICIES_SQL),
      pool.query(LIVE_CONSTRAINTS_SQL),
      pool.query(LIVE_UNIQUE_INDEXES_SQL),
    ]);

    const tables = new Map();
    for (const r of tablesRes.rows) {
      tables.set(r.table_name, { name: r.table_name, rls: r.rls_enabled, columns: new Map(), policies: new Set(), pkCols: [], uniques: [] });
    }
    for (const r of colsRes.rows) {
      const t = tables.get(r.table_name);
      if (!t) continue;
      t.columns.set(r.column_name, { raw: r.full_type, cmp: compareType(r.full_type) });
    }
    for (const r of polRes.rows) {
      const t = tables.get(r.table_name);
      if (t) t.policies.add(r.policy_name);
    }
    const uniqueKeys = new Set(); // "table::col1,col2" for both PK and unique
    for (const r of conRes.rows) {
      const t = tables.get(r.table_name);
      if (!t) continue;
      const cols = r.cols.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (r.constraint_type === 'PRIMARY KEY') {
        t.pkCols = cols;
      } else {
        t.uniques.push(cols);
        uniqueKeys.add(`${r.table_name}::${cols.slice().sort().join(',')}`);
      }
    }
    // Unique indexes that are not backed by a UNIQUE constraint.
    for (const r of idxRes.rows) {
      const m = r.indexdef.match(/ON\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+USING\s+[a-z0-9_]+\s*\(([^)]+)\)/i);
      if (!m) continue;
      const t = tables.get(m[1]);
      if (!t) continue;
      const cols = extractUniqueColsFromIndex(m[2]);
      const key = `${m[1]}::${cols.slice().sort().join(',')}`;
      if (!uniqueKeys.has(key)) {
        t.uniques.push(cols);
        uniqueKeys.add(key);
      }
    }
    return tables;
  } finally {
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

function sortKeys(mapOrSet) {
  return [...mapOrSet.keys()].sort();
}

export function diff(expected, live) {
  const f = {
    missingTables: [],      // { name, expected }
    extraTables: [],        // { name, live }
    columnDrift: [],        // { table, kind, col, expected, actual, source }
    pkDrift: [],            // { table, col, expected, actual, source }
    rlsDrift: [],           // { table, expected, actual, source, direction }
    policyDrift: [],        // { table, kind, policy, source }
    uniqueDrift: [],        // { table, cols, source }
  };

  const expectedNames = sortKeys(expected.tables);
  const liveNames = sortKeys(live);

  // 1 + 2: missing / extra tables
  for (const name of expectedNames) {
    if (!live.has(name)) {
      f.missingTables.push({ name, expected: expected.tables.get(name) });
    }
  }
  for (const name of liveNames) {
    if (!expected.tables.has(name)) {
      f.extraTables.push({ name, live: live.get(name) });
    }
  }

  // 3: column drift + 4: PK drift + 5: RLS + 6: policies + 7: unique
  for (const name of expectedNames) {
    const exp = expected.tables.get(name);
    const liv = live.get(name);
    if (!liv) continue; // missing tables reported above

    // columns
    for (const [col, c] of exp.columns) {
      const lc = liv.columns.get(col);
      if (!lc) {
        f.columnDrift.push({ table: name, kind: 'MISSING_IN_LIVE', col, expected: c.cmp, actual: null, source: c.source });
      } else if (lc.cmp !== c.cmp) {
        f.columnDrift.push({ table: name, kind: 'TYPE', col, expected: c.cmp, actual: lc.cmp, source: c.source });
      }
    }
    for (const [col, lc] of liv.columns) {
      if (!exp.columns.has(col)) {
        f.columnDrift.push({ table: name, kind: 'MISSING_IN_MIGRATIONS', col, expected: null, actual: lc.cmp, source: null });
      }
    }

    // PK type drift (serial-vs-uuid class)
    const expPkCols = exp.pkCols;
    const livePkCols = liv.pkCols;
    if (expPkCols.length && livePkCols.length) {
      for (const col of expPkCols) {
        const expType = exp.columns.get(col);
        const liveType = liv.columns.get(col);
        if (!expType) continue;
        if (!liveType) {
          f.pkDrift.push({ table: name, col, expected: expType.cmp, actual: null, source: expType.source });
        } else if (liveType.cmp !== expType.cmp) {
          f.pkDrift.push({ table: name, col, expected: expType.cmp, actual: liveType.cmp, source: expType.source });
        }
      }
    } else if (expPkCols.length && !livePkCols.length) {
      f.pkDrift.push({ table: name, col: expPkCols.join(','), expected: 'PRIMARY KEY', actual: 'NO PRIMARY KEY', source: exp.pkSource });
    } else if (!expPkCols.length && livePkCols.length) {
      f.pkDrift.push({ table: name, col: livePkCols.join(','), expected: 'NO PRIMARY KEY', actual: 'PRIMARY KEY', source: null });
    }

    // RLS
    if (exp.rls && !liv.rls) {
      f.rlsDrift.push({ table: name, expected: 'ENABLED', actual: 'DISABLED', source: exp.rlsSource, direction: 'ENABLED_IN_MIGRATIONS_DISABLED_IN_LIVE' });
    } else if (!exp.rls && liv.rls) {
      f.rlsDrift.push({ table: name, expected: 'DISABLED', actual: 'ENABLED', source: null, direction: 'ENABLED_IN_LIVE_ONLY' });
    }

    // policies
    if (exp.policies.size > 0 && liv.policies.size === 0) {
      f.policyDrift.push({ table: name, kind: 'TABLE_HAS_EXPECTED_POLICIES_BUT_ZERO_IN_LIVE', policy: null, source: [...exp.policies.values()][0] });
    }
    for (const [policy, source] of exp.policies) {
      if (!liv.policies.has(policy)) {
        f.policyDrift.push({ table: name, kind: 'MISSING_IN_LIVE', policy, source });
      }
    }
    for (const policy of liv.policies) {
      if (!exp.policies.has(policy)) {
        f.policyDrift.push({ table: name, kind: 'ONLY_IN_LIVE', policy, source: null });
      }
    }

    // unique constraints
    const liveUnique = new Set(liv.uniques.map((cols) => cols.slice().sort().join(',')));
    for (const u of exp.uniques) {
      const key = u.cols.slice().sort().join(',');
      if (!liveUnique.has(key)) {
        f.uniqueDrift.push({ table: name, cols: u.cols, source: u.source });
      }
    }
  }

  return f;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printSection(title, lines) {
  console.log('');
  console.log(`=== ${title} ===`);
  for (const l of lines) console.log(l);
}

function report(findings) {
  const total =
    findings.missingTables.length +
    findings.extraTables.length +
    findings.columnDrift.length +
    findings.pkDrift.length +
    findings.rlsDrift.length +
    findings.policyDrift.length +
    findings.uniqueDrift.length;

  if (total === 0) {
    console.log('No schema drift detected in the constructs this script can parse.');
    console.log('(This is a best-effort line-level parser — see header comment for limits.)');
    return 0;
  }

  console.log(`Schema drift detected: ${total} finding(s).`);
  console.log('Legend: [MISSING] expected by migrations but absent from live · [EXTRA] in live but not in migrations · [TYPE] type mismatch');

  if (findings.missingTables.length) {
    printSection(`TABLES IN MIGRATIONS BUT MISSING IN LIVE (${findings.missingTables.length})`, findings.missingTables.map(({ name, expected }) => {
      return `  [MISSING] ${name}  (expected ${expected.columns.size} col(s), ${expected.policies.size} policy/policies, ${expected.uniques.length} unique(s); first created ${expected.createdBy})`;
    }));
  }

  if (findings.extraTables.length) {
    printSection(`TABLES IN LIVE BUT NOT IN MIGRATIONS (${findings.extraTables.length})`, findings.extraTables.map(({ name, live }) => {
      return `  [EXTRA] ${name}  (live has ${live.columns.size} col(s), ${live.policies.size} policy/policies)`;
    }));
  }

  if (findings.columnDrift.length) {
    printSection(`COLUMN DRIFT (${findings.columnDrift.length})`, findings.columnDrift.map((d) => {
      if (d.kind === 'MISSING_IN_LIVE') {
        return `  [MISSING] ${d.table}.${d.col}  expected ${d.expected}  (${d.source})`;
      }
      if (d.kind === 'MISSING_IN_MIGRATIONS') {
        return `  [EXTRA] ${d.table}.${d.col}  live type ${d.actual}  (not declared in any migration)`;
      }
      return `  [TYPE] ${d.table}.${d.col}  expected ${d.expected} got ${d.actual}  (${d.source})`;
    }));
  }

  if (findings.pkDrift.length) {
    printSection(`PRIMARY KEY DRIFT (serial-vs-uuid class) (${findings.pkDrift.length})`, findings.pkDrift.map((d) => {
      const source = d.source ? `  (${d.source})` : '  (migrations declare no PRIMARY KEY for this table)';
      return `  [PK] ${d.table}(${d.col})  expected ${d.expected} got ${d.actual}${source}`;
    }));
  }

  if (findings.rlsDrift.length) {
    printSection(`ROW LEVEL SECURITY DRIFT (${findings.rlsDrift.length})`, findings.rlsDrift.map((d) => {
      if (d.direction === 'ENABLED_IN_MIGRATIONS_DISABLED_IN_LIVE') {
        return `  [RLS] ${d.table}  migrations ENABLE ROW LEVEL SECURITY but live relrowsecurity=false  (${d.source})`;
      }
      return `  [RLS] ${d.table}  live relrowsecurity=true but no migration enables it (manual drift)`;
    }));
  }

  if (findings.policyDrift.length) {
    const byTable = new Map();
    for (const d of findings.policyDrift) {
      if (!byTable.has(d.table)) byTable.set(d.table, []);
      byTable.get(d.table).push(d);
    }
    const lines = [];
    for (const [table, ds] of byTable) {
      const missing = ds.filter((d) => d.kind === 'MISSING_IN_LIVE');
      const onlyLive = ds.filter((d) => d.kind === 'ONLY_IN_LIVE');
      const zero = ds.filter((d) => d.kind === 'TABLE_HAS_EXPECTED_POLICIES_BUT_ZERO_IN_LIVE');
      if (zero.length) {
        lines.push(`  [POLICY] ${table}  has 0 policies in live but migrations define policies  (e.g. ${zero[0].source})`);
      }
      for (const d of missing) {
        lines.push(`  [POLICY] ${table}  missing policy "${d.policy}" in live  (${d.source})`);
      }
      for (const d of onlyLive) {
        lines.push(`  [POLICY] ${table}  policy "${d.policy}" exists only in live (not declared in migrations)`);
      }
    }
    printSection(`POLICY DRIFT (${findings.policyDrift.length})`, lines);
  }

  if (findings.uniqueDrift.length) {
    printSection(`UNIQUE CONSTRAINT DRIFT (${findings.uniqueDrift.length})`, findings.uniqueDrift.map((d) => {
      return `  [UNIQUE] ${d.table}  expected UNIQUE on (${d.cols.join(', ')}) missing in live  (${d.source})`;
    }));
  }

  console.log('');
  console.log(`Summary: ${findings.missingTables.length} missing table(s), ${findings.extraTables.length} extra table(s), ` +
    `${findings.columnDrift.length} column drift, ${findings.pkDrift.length} PK drift, ` +
    `${findings.rlsDrift.length} RLS drift, ${findings.policyDrift.length} policy drift, ` +
    `${findings.uniqueDrift.length} unique drift.`);
  return 1;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  console.log(`
check-schema-drift.mjs — compare supabase/migrations (+ supabase/schema.sql) against the live database.

USAGE
  DATABASE_URL='postgres://...' node scripts/check-schema-drift.mjs
  node scripts/check-schema-drift.mjs --db='postgres://...'

OPTIONS
  --db=<url>        Connection string (a Supabase pooler URL is fine). Overrides DATABASE_URL.
  --parse-only      Parse the migration files and print expected-model stats without connecting.
  --exclude-schema  Skip supabase/schema.sql (referenced by ARCHITECTURE.md §2.6 as order 0).
  --help            Show this help.

EXIT CODES
  0  clean — no drift in the constructs this parser understands
  1  drift found, or DATABASE_URL/--db missing
  2  infrastructure error (missing files, missing pg module, or DB connection failure)

SECURITY
  The connection string is never printed. Row data is never printed.
`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      db: { type: 'string' },
      'parse-only': { type: 'boolean', default: false },
      'exclude-schema': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    usage();
    process.exit(0);
  }

  // 1. Connection string (env or --db). Never printed.
  const dbUrl = values.db || process.env.DATABASE_URL;
  if (!dbUrl && !values['parse-only']) {
    console.error(
      'ERROR: No database connection string found.\n' +
      '  Set the DATABASE_URL environment variable (a Supabase pooler URL is acceptable)\n' +
      '  or pass --db="postgres://...".\n' +
      '  Note: .env.example does not define DATABASE_URL; export it in your shell.'
    );
    process.exit(1);
  }

  // 2. Expected model from files.
  let expected;
  try {
    expected = buildExpectedModel({ includeSchema: !values['exclude-schema'] });
  } catch (err) {
    console.error(`ERROR: could not build expected schema model: ${err.message}`);
    process.exit(2);
  }

  if (values['parse-only']) {
    console.log(`Parsed expected model from ${expected.tables.size} table(s):`);
    for (const [name, t] of [...expected.tables.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      console.log(
        `  ${name.padEnd(38)} ${String(t.columns.size).padStart(3)} col(s)  ` +
        `pk=[${t.pkCols.join(',')}]  rls=${t.rls ? 'on' : 'off'}  ` +
        `${t.policies.size} policy/policies  ${t.uniques.length} unique(s)`
      );
    }
    process.exit(0);
  }

  // 3. Live model.
  let live;
  try {
    live = await queryLiveModel(dbUrl);
  } catch (err) {
    console.error('ERROR: could not query the live database.');
    console.error(`  ${err.message}`);
    console.error('  (connection errors are reported without the connection string or password)');
    process.exit(2);
  }

  console.log('Connected to live Postgres via DATABASE_URL. Running drift comparison...');
  console.log(`Expected scope: supabase/schema.sql (runbook: ${RUNBOOK_SCHEMA_REF}) + supabase/migrations/*.sql (${expected.tables.size} tables parsed).`);

  // 4. Diff + report.
  const findings = diff(expected, live);
  const code = report(findings);
  process.exit(code);
}

// Only run main when executed directly (allows importing buildExpectedModel /
// diff for testing without a live DB).
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await main();
}
