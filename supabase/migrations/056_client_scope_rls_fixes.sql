-- 056_client_scope_rls_fixes.sql
-- Client-scope RLS fixes from the prior security analysis.
--
-- Reuses the helpers established by 050/052/055:
--   public.auth_client_ids()     (052, SECURITY DEFINER)
--   public.user_role()           (050, reads app_metadata only)
--   public.is_admin()            (050, super_admin | crm_admin | cms_admin)
--   public.portal_can_see_sharing() (052)
--
-- Each finding is tagged with a short -- P# comment.

BEGIN;

-- ===========================================================================
-- P1: PROFILES ENUMERATION (HIGH)
-- 026 created "authenticated can read profiles" USING (true): every
-- authenticated user can enumerate every profile row. Replace it with a
-- scoped read policy: the row owner, any user sharing a client membership
-- (clients.user_id or client_users.user_id, intersected with the reader's
-- auth_client_ids()), or staff (is_admin()). Writes remain self-only via the
-- existing "user can update own profile" policy from 026.
-- ===========================================================================

-- New SECURITY DEFINER helper so the profiles policy can compute the client
-- associations of an arbitrary profile row WITHOUT being limited by RLS on
-- clients/client_users (mirrors the pattern used by auth_client_ids() in 052).
-- auth_client_ids() itself is intentionally left unchanged (decision pending).
CREATE OR REPLACE FUNCTION public.user_client_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT c.id FROM public.clients c WHERE c.user_id = p_user_id
  UNION
  SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = p_user_id
$$;

DROP POLICY IF EXISTS "authenticated can read profiles" ON public.profiles;
CREATE POLICY "profiles scoped read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_client_ids(public.profiles.id) AS pc(client_id)
      WHERE pc.client_id IN (SELECT public.auth_client_ids())
    )
  );

-- ===========================================================================
-- P2: OPERATIONAL TABLES WITH NO RLS (HIGH)
-- report_schedules / webhook_events / report_generation_locks were created
-- without RLS (049/054/055) and are reachable by anon/authenticated through
-- the Supabase API. They are internal server tables.
--
-- NOTE on report_schedules: the app writes it via supabase-js with the
-- authenticated ADMIN user (src/app/api/admin/report-schedules/*). So unlike
-- the other two tables we must keep the GRANT for `authenticated` (row-level
-- access is then gated by the staff-only RLS policy) and only REVOKE `anon`.
-- webhook_events (Stripe webhook) and report_generation_locks (raw pg only)
-- get REVOKE ALL from both anon and authenticated; the service role / direct
-- pg pool bypasses RLS, so no policies are created for them.
-- ===========================================================================

-- ── report_schedules (049) ─────────────────────────────────────
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_schedules staff all" ON public.report_schedules;
CREATE POLICY "report_schedules staff all" ON public.report_schedules
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.user_role() = ANY(ARRAY['crm_staff','finance']))
  WITH CHECK (public.is_admin() OR public.user_role() = ANY(ARRAY['crm_staff','finance']));

-- Defense-in-depth: never expose schedules to the anon role via the API.
REVOKE ALL ON TABLE public.report_schedules FROM anon;

-- The finding asked for a UNIQUE constraint on report_id, but report_schedules
-- has NO report_id column (049 defines id, client_id, name, report_type,
-- frequency, next_run_at, last_run_at, enabled, created_at). The closest
-- faithful dedupe is one schedule per client × report_type × frequency.
-- Guarded so existing dirty data (duplicates) never fails the migration.
DO $$ BEGIN
  IF to_regclass('public.report_schedules') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'report_schedules'
         AND indexname = 'uq_report_schedules_client_type_frequency'
     ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.report_schedules
      GROUP BY client_id, report_type, frequency
      HAVING COUNT(*) > 1
      LIMIT 1
    ) THEN
      CREATE UNIQUE INDEX uq_report_schedules_client_type_frequency
        ON public.report_schedules (client_id, report_type, frequency);
    ELSE
      RAISE NOTICE 'report_schedules has duplicate (client_id, report_type, frequency) rows; skipping unique index';
    END IF;
  END IF;
END $$;

-- ── webhook_events (054) ───────────────────────────────────────
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- Only the Stripe webhook writes this via raw pg (src/app/api/stripe/webhook).
REVOKE ALL ON TABLE public.webhook_events FROM anon, authenticated;

-- ── report_generation_locks (055) ──────────────────────────────
-- CRITICAL: previously anon-WRITABLE (no RLS). Any anonymous request could
-- INSERT a lock row for an arbitrary client_id, permanently blocking report
-- generation for that client (a permanent-report-DoS vector).
ALTER TABLE public.report_generation_locks ENABLE ROW LEVEL SECURITY;
-- Only raw pg writes this (admin generate-client-reports + portal reports
-- generate). No policies needed; service role / pg pool bypass RLS.
REVOKE ALL ON TABLE public.report_generation_locks FROM anon, authenticated;

-- ===========================================================================
-- P3: PROJECT-LINKED DOCUMENTS/DELIVERABLES UNREACHABLE (MEDIUM, functional)
-- 052's client read policies for documents/deliverables check only client_id,
-- but the portal API resolves rows through project_id paths
-- (src/app/api/portal/deliverables/route.ts uses
-- `.or("client_id.eq.X,project_id.in.(...)")`). A client can therefore never
-- see rows linked only via project_id. Scope read (and the new update policies)
-- to BOTH (a) rows owned by the client's own client_id AND (b) rows belonging
-- to a project whose client_id is in auth_client_ids().
-- ===========================================================================

-- ── documents ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients can read visible documents scoped" ON public.documents;
CREATE POLICY "clients can read visible documents scoped" ON public.documents
  FOR SELECT TO authenticated
  USING (
    visible_to_client = true
    AND (
      client_id IN (SELECT public.auth_client_ids())
      OR project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.client_id IN (SELECT public.auth_client_ids())
      )
    )
  );

-- Client UPDATE for their own visible documents (same scope as read).
DROP POLICY IF EXISTS "clients can update visible documents scoped" ON public.documents;
CREATE POLICY "clients can update visible documents scoped" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    visible_to_client = true
    AND (
      client_id IN (SELECT public.auth_client_ids())
      OR project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.client_id IN (SELECT public.auth_client_ids())
      )
    )
  )
  WITH CHECK (
    visible_to_client = true
    AND (
      client_id IN (SELECT public.auth_client_ids())
      OR project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.client_id IN (SELECT public.auth_client_ids())
      )
    )
  );

-- ── deliverables ───────────────────────────────────────────────
DROP POLICY IF EXISTS "client can read own deliverables scoped" ON public.deliverables;
CREATE POLICY "client can read own deliverables scoped" ON public.deliverables
  FOR SELECT TO authenticated
  USING (
    visible_to_client = true
    AND (
      client_id IN (SELECT public.auth_client_ids())
      OR project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.client_id IN (SELECT public.auth_client_ids())
      )
    )
  );

-- Deliverables PUT approval flow (src/app/api/portal/deliverables/[id]/route.ts)
-- was previously denied by RLS because there was no UPDATE policy for clients.
DROP POLICY IF EXISTS "client can update own deliverables scoped" ON public.deliverables;
CREATE POLICY "client can update own deliverables scoped" ON public.deliverables
  FOR UPDATE TO authenticated
  USING (
    visible_to_client = true
    AND (
      client_id IN (SELECT public.auth_client_ids())
      OR project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.client_id IN (SELECT public.auth_client_ids())
      )
    )
  )
  WITH CHECK (
    visible_to_client = true
    AND (
      client_id IN (SELECT public.auth_client_ids())
      OR project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.client_id IN (SELECT public.auth_client_ids())
      )
    )
  );

-- ===========================================================================
-- P4: ANALYTICS_PRODUCTS NULL-WILDCARD PARITY (MEDIUM)
-- The 052 analytics_products policy only matches sharing rows where
-- category_id IS NOT NULL, so an "all categories" share (NULL category_id)
-- yields ZERO products even though the branch/category dimension policies
-- treat a NULL sharing dimension as a wildcard. Bring analytics_products in
-- line with analytics_branches / analytics_categories by matching sharing rows
-- whose category_id is NULL (wildcard) OR equals the product's category.
-- ===========================================================================
DROP POLICY IF EXISTS "client can read analytics_products scoped" ON public.analytics_products;
CREATE POLICY "client can read analytics_products scoped" ON public.analytics_products
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.portal_analytics_sharing sh
      WHERE sh.client_id IN (SELECT public.auth_client_ids())
        AND sh.visible
        AND (sh.category_id = public.analytics_products.category_id OR sh.category_id IS NULL)
    )
  );

-- ===========================================================================
-- P5: ANALYTICS_PERIODS UNIQUE (LOW)
-- 006 only added UNIQUE (start_date, end_date). Enforce (year, month) so a
-- period bucket cannot be created twice. Guarded so dirty data cannot fail the
-- migration.
-- ===========================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_periods_year_month_key'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.analytics_periods
      GROUP BY year, month
      HAVING COUNT(*) > 1
      LIMIT 1
    ) THEN
      ALTER TABLE public.analytics_periods
        ADD CONSTRAINT analytics_periods_year_month_key UNIQUE (year, month);
    ELSE
      RAISE NOTICE 'analytics_periods has duplicate (year, month) rows; skipping unique constraint';
    END IF;
  END IF;
END $$;

-- ===========================================================================
-- P6: LEFTOVER schema.sql assigned_to POLICIES (MEDIUM)
-- schema.sql still grants read/UPDATE to "any uid listed in assigned_to" with
-- no role check on clients, leads, projects, tasks, conversations,
-- research_projects. A client-role user whose uid appears in assigned_to could
-- read/UPDATE those rows. The app only ever assigns STAFF users (see
-- src/app/api/clients|projects|tasks|conversations/route.ts: assigned_to is a
-- staff-account field, and client-role users are never assigned). Therefore
-- each assigned_to policy is replaced by an equivalent that ALSO requires a
-- staff role (is_admin() OR user_role() IN ('crm_staff','finance')), so a
-- client-role user can never leverage assigned_to while staff access is kept.
-- ===========================================================================

-- ── clients ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin can read all clients" ON public.clients;
CREATE POLICY "admin can read all clients scoped" ON public.clients
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "admin can update clients" ON public.clients;
CREATE POLICY "admin can update clients scoped" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

-- ── leads ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read leads" ON public.leads;
CREATE POLICY "admin or assigned staff can read leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "admin or assigned can update leads" ON public.leads;
CREATE POLICY "admin or assigned staff can update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

-- ── projects ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read projects" ON public.projects;
CREATE POLICY "admin or assigned staff can read projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "admin or assigned can update projects" ON public.projects;
CREATE POLICY "admin or assigned staff can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

-- ── tasks ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read tasks" ON public.tasks;
CREATE POLICY "admin or assigned staff can read tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "admin or assigned can update tasks" ON public.tasks;
CREATE POLICY "admin or assigned staff can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

-- ── conversations ──────────────────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read conversations" ON public.conversations;
CREATE POLICY "admin or assigned staff can read conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "admin or assigned can insert conversations" ON public.conversations;
CREATE POLICY "admin or assigned staff can insert conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "admin or assigned can update conversations" ON public.conversations;
CREATE POLICY "admin or assigned staff can update conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND assigned_to = auth.uid())
  );

-- ── research_projects (subqueries the project's assigned_to) ──
DROP POLICY IF EXISTS "admin or assigned can read research_projects" ON public.research_projects;
CREATE POLICY "admin or assigned staff can read research_projects" ON public.research_projects
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.user_role() = ANY(ARRAY['crm_staff','finance'])
      AND auth.uid() IN (
        SELECT p.assigned_to FROM public.projects p
        WHERE p.id = research_projects.project_id
      )
    )
  );

-- ── deliverables: same uid-leverage class via uploaded_by ──────
-- schema.sql's "admin or uploader" policies let ANY authenticated user whose
-- uid appears in uploaded_by read/insert/delete. Deliverables has no
-- assigned_to column, but uploaded_by is the same "uid with no role check"
-- vector. Require staff role (admin uploads go through raw pg in
-- insertDeliverablePg and are unaffected; the app's deliverable PATCH route is
-- isAdmin-gated). Client access to their own visible deliverables is handled
-- by the P3 SELECT/UPDATE policies above.
DROP POLICY IF EXISTS "admin or uploader can read deliverables" ON public.deliverables;
CREATE POLICY "admin or uploader staff can read deliverables" ON public.deliverables
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND uploaded_by = auth.uid())
  );

DROP POLICY IF EXISTS "admin or uploader can insert deliverables" ON public.deliverables;
CREATE POLICY "admin or uploader staff can insert deliverables" ON public.deliverables
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND uploaded_by = auth.uid())
  );

DROP POLICY IF EXISTS "admin or uploader can delete deliverables" ON public.deliverables;
CREATE POLICY "admin or uploader staff can delete deliverables" ON public.deliverables
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (public.user_role() = ANY(ARRAY['crm_staff','finance']) AND uploaded_by = auth.uid())
  );

-- ── documents: staff "assigned projects" policies (004) ────────
-- Same assigned_to-leverage class: 004 gated on `NOT is_admin()` so a
-- client-role user whose uid appears in projects.assigned_to could read/
-- insert/update that project's documents. Require staff role instead.
DROP POLICY IF EXISTS "staff can read documents for assigned projects" ON public.documents;
CREATE POLICY "staff can read documents for assigned projects scoped" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.user_role() = ANY(ARRAY['crm_staff','finance'])
      AND project_id IN (SELECT p.id FROM public.projects p WHERE p.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "staff can insert documents for assigned projects" ON public.documents;
CREATE POLICY "staff can insert documents for assigned projects scoped" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.user_role() = ANY(ARRAY['crm_staff','finance'])
      AND project_id IN (SELECT p.id FROM public.projects p WHERE p.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "staff can update documents for assigned projects" ON public.documents;
CREATE POLICY "staff can update documents for assigned projects scoped" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.user_role() = ANY(ARRAY['crm_staff','finance'])
      AND project_id IN (SELECT p.id FROM public.projects p WHERE p.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.user_role() = ANY(ARRAY['crm_staff','finance'])
      AND project_id IN (SELECT p.id FROM public.projects p WHERE p.assigned_to = auth.uid())
    )
  );

-- ===========================================================================
-- P7 (Minor): SHARING READ POLICY MUST HIDE INVISIBLE ROWS
-- 052's "client can read own analytics sharing scoped" let a client read their
-- own sharing rows including visible = false ones, revealing exactly what was
-- explicitly withheld from them. Gate on visible = true.
-- ===========================================================================
DROP POLICY IF EXISTS "client can read own analytics sharing scoped" ON public.portal_analytics_sharing;
CREATE POLICY "client can read own analytics sharing scoped" ON public.portal_analytics_sharing
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT public.auth_client_ids()) AND visible = true);

COMMIT;
