import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Offline-first v1 sync queue: stages outgoing payloads in a Hive box keyed
/// by `entity:row-id` and flushes them to the server (via the `sync-push`
/// edge function) when the device is online.

/// A sync-queue entry paired with its box key (`$entity:$rowId`) so per-row
/// server results (keyed by the payload's uuid) can be mapped back to the
/// exact Hive entry that must be marked synced — or kept pending.
typedef _SyncEntry = ({String boxKey, Map<String, dynamic> payload});

class SyncService {
  SyncService._();

  static final SyncService instance = SyncService._();

  /// Parent-before-child push order so `sync_apply` never hits a foreign-key
  /// violation on a row that has not been applied yet. Hive returns box
  /// values sorted by key, so the enqueue order is lost; [flush] re-orders by
  /// this list. Unknown entities sort last, preserving their arrival order.
  static const List<String> pushOrder = [
    'consent_records',
    'outlets',
    'retailers',
    'routes',
    'route_stops',
    'outlet_contacts',
    'outlet_client_links',
    'visits',
    'visit_items',
    'order_intents',
    'order_intent_items',
    'competitor_observations',
    'health_scores',
    'stock_observations',
    'shelf_photos',
    'category_observations',
    'consumer_intercepts',
    'daily_submissions',
    'back_checks',
  ];

  /// Max serialized JSON size per `sync-push` invocation. Supabase Edge
  /// Functions reject request bodies above ~6MB (hard platform cap); we target
  /// a much smaller ceiling so a 95MB backlog is split into many safe calls
  /// and each stays comfortably under the body limit and the CPU/time caps.
  /// 1.5MB leaves ample headroom for JSON escaping, wrapper fields and the
  /// edge gateway overhead.
  static const int kMaxBatchBytes = 1536 * 1024; // 1.5 MB

  /// Split [rows] into sub-lists whose serialized JSON size stays under
  /// [kMaxBatchBytes]. Keeps every `sync-push` invocation within Supabase's
  /// request-body limit regardless of how large the on-device backlog grows.
  static List<List<Map<String, dynamic>>> chunkRows(
      List<Map<String, dynamic>> rows) {
    final chunks = <List<Map<String, dynamic>>>[];
    var current = <Map<String, dynamic>>[];
    var currentBytes = 0;
    for (final row in rows) {
      // Approximate serialized size (utf8 byte length of the JSON map, plus a
      // small per-row separator allowance).
      final rowBytes = _jsonWeight(row);
      if (current.isNotEmpty && currentBytes + rowBytes > kMaxBatchBytes) {
        chunks.add(current);
        current = [];
        currentBytes = 0;
      }
      current.add(row);
      currentBytes += rowBytes;
    }
    if (current.isNotEmpty) chunks.add(current);
    return chunks;
  }

  /// Same size-bounded chunking as [chunkRows] but over [SyncService] queue
  /// entries so each chunk stays correlated with its box keys when the server
  /// reports per-row failures. Weights each payload with the same
  /// [kMaxBatchBytes] ceiling.
  static List<List<_SyncEntry>> _chunkEntries(List<_SyncEntry> entries) {
    final chunks = <List<_SyncEntry>>[];
    var current = <_SyncEntry>[];
    var currentBytes = 0;
    for (final entry in entries) {
      final rowBytes = _jsonWeight(entry.payload);
      if (current.isNotEmpty && currentBytes + rowBytes > kMaxBatchBytes) {
        chunks.add(current);
        current = [];
        currentBytes = 0;
      }
      current.add(entry);
      currentBytes += rowBytes;
    }
    if (current.isNotEmpty) chunks.add(current);
    return chunks;
  }

  static int _jsonWeight(Map<String, dynamic> row) {
    try {
      // raw jsonEncode of the whole row is the most accurate, but doing it
      // per row is wasteful; compute the row's own JSON weight instead.
      return jsonEncode(row).length;
    } catch (_) {
      return 512; // fallback upper-ish bound if a row fails to encode
    }
  }

  /// Order [entities] by [pushOrder]; unknown entities come last in their
  /// given order.
  static List<String> orderedEntities(Iterable<String> entities) {
    final seen = <String>{};
    final ordered = <String>[];
    for (final e in pushOrder) {
      if (seen.add(e) && entities.contains(e)) ordered.add(e);
    }
    for (final e in entities) {
      if (seen.add(e)) ordered.add(e);
    }
    return ordered;
  }

  late Box _pendingSyncBox;
  late Box _pendingMediaBox;
  late Box _deadLetterBox;
  bool _ready = false;

  Future<void> init() async {
    if (_ready) return;
    _pendingSyncBox = await Hive.openBox('pending_sync');
    _pendingMediaBox = await Hive.openBox('pending_media');
    _deadLetterBox = await Hive.openBox('dead_letter');
    _ready = true;
  }

  bool get isReady => _ready;

  Box get pendingSyncBox => _pendingSyncBox;

  /// Pending binary uploads (shelf photos). Photo metadata rows flow through
  /// [pendingSyncBox] like any other entity, but the actual image bytes live
  /// on the device and must be pushed separately (they are too large for the
  /// JSON sync-push body). We track them here so a capture-time failure is
  /// retried on a later flush pass instead of being silently lost.
  Box get pendingMediaBox => _pendingMediaBox;

  /// Queue a binary for upload. Keyed by `entity:rowId` (e.g. `shelf_photos:<id>`)
  /// so re-capture updates rather than duplicates. [repId] is the owning rep so
  /// the upload callback can place the object under the rep's storage prefix.
  Future<void> enqueuePendingMedia({
    required String entity,
    required String rowId,
    required String filePath,
    String? repId,
  }) async {
    await _pendingMediaBox.put('$entity:$rowId', {
      'id': '$entity:$rowId',
      'entity': entity,
      'row_id': rowId,
      'file_path': filePath,
      'rep_id': repId,
    });
  }

  /// All binaries still awaiting upload, walked LAZILY over the Hive box keys
  /// (one value at a time) so a huge backlog is never materialized in memory
  /// at once. Consumers must iterate the returned [Iterable] — do not call
  /// `.toList()` on an unbounded queue.
  Iterable<Map<String, dynamic>> get pendingMedia =>
      _pendingMediaBox.keys.map((key) {
        final v = _pendingMediaBox.get(key);
        if (v == null) return <String, dynamic>{};
        return (v as Map).map((k, val) => MapEntry(k.toString(), val));
      });

  int get pendingMediaCount => _pendingMediaBox.length;

  /// Rows that exhausted [kMaxAttempts] server retries and were moved to the
  /// `dead_letter` Hive box (key `$entity:$rowId`, entry includes the original
  /// row + `last_error` + `attempts`). They are preserved, never silently
  /// dropped — this count gives future UI a way to surface them for review.
  int get deadLetterCount => _deadLetterBox.length;

  /// Drop a binary from the pending set once confirmed uploaded (or abandoned).
  Future<void> removePendingMedia(String entity, String rowId) async {
    await _pendingMediaBox.delete('$entity:$rowId');
  }

  /// Enqueue a row for [entity]. Last-write-wins on the local queue: an
  /// entry with the same `[entity]:[rowId]` key is replaced. Every entry
  /// carries an `attempts` counter (starts at 0) so permanently-bad rows can
  /// be moved to the dead-letter box instead of blocking the drain forever.
  Future<void> enqueueSync(String entity, String rowId, Map<String, dynamic> row) async {
    await _pendingSyncBox.put('$entity:$rowId', {
      'id': '$entity:$rowId',
      'entity': entity,
      'row_id': rowId,
      'payload': row,
      'synced': false,
      'attempts': 0,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  /// Mark the entry for [id] as synced. The entry is kept in the box so the
  /// history is inspectable, but [pendingItems] excludes it.
  Future<void> markSynced(String id) async {
    final existing = _pendingSyncBox.get(id);
    if (existing == null) return;
    await _pendingSyncBox.put(id, {...existing, 'synced': true});
  }

  /// Remove all entries flagged as synced. Call after a successful flush.
  Future<void> purgeSynced() async {
    for (final k in _pendingSyncBox.keys.toList()) {
      final v = _pendingSyncBox.get(k);
      if (v != null && v['synced'] == true) {
        await _pendingSyncBox.delete(k);
      }
    }
  }

  /// A server-confirmed failure for a pending row: bump its `attempts`
  /// counter. Once a row exceeds [kMaxAttempts], MOVE it to the `dead_letter`
  /// box (key `$entity:$rowId`, preserving the entry + `last_error` +
  /// `attempts`) and DELETE it from `pending_sync` so it stops blocking the
  /// drain. Rows in dead-letter are explicitly preserved for inspection —
  /// never silently discarded.
  Future<void> _handleFailedSync(String boxKey, String reason) async {
    final existing = _pendingSyncBox.get(boxKey);
    if (existing is! Map) return;
    final attempts = ((existing['attempts'] as num?) ?? 0).toInt() + 1;
    final updated = {
      ...existing,
      'attempts': attempts,
      'last_error': reason,
      'synced': false,
    };
    if (attempts >= kMaxAttempts) {
      await _deadLetterBox.put(boxKey, {
        ...updated,
        'dead_lettered_at': DateTime.now().toIso8601String(),
      });
      await _pendingSyncBox.delete(boxKey);
    } else {
      await _pendingSyncBox.put(boxKey, updated);
    }
  }

  /// All entries that have not yet been synced.
  /// CAUTION: materializes the WHOLE box (93MB+ risk). Prefer [oldestPending]
  /// for bounded drains.
  List<Map<String, dynamic>> get pendingItems => _pendingSyncBox.values
      .where((v) => v != null && v['synced'] != true)
      .map((v) => (v as Map).map((k, val) => MapEntry(k.toString(), val)))
      .toList();

  /// The oldest [limit] unsynced entries, walked lazily over the Hive box so a
  /// huge backlog is NEVER loaded into memory in one pass. Hive boxes order
  /// values by key insertion; we additionally sort by created_at so retries
  /// drain oldest-first, but only bounded to [limit] rows.
  List<Map<String, dynamic>> oldestPending(int limit) {
    if (limit <= 0) return const [];
    final items = <Map<String, dynamic>>[];
    for (final v in _pendingSyncBox.values) {
      if (v == null || v['synced'] == true) continue;
      items.add((v as Map).map((k, val) => MapEntry(k.toString(), val)));
      if (items.length >= limit) break;
    }
    // Bounded sort (never the whole box): Hive key order may mix creation times.
    items.sort((a, b) {
      final at = (a['created_at'] as String?) ?? '';
      final bt = (b['created_at'] as String?) ?? '';
      return at.compareTo(bt);
    });
    return items;
  }

  /// Unsynced entry count, computed lazily without loading the whole box.
  int get pendingCount {
    var n = 0;
    for (final v in _pendingSyncBox.values) {
      if (v == null || v['synced'] == true) continue;
      n++;
    }
    return n;
  }

  Future<bool> get isOnline async {
    final results = await Connectivity().checkConnectivity();
    return results != ConnectivityResult.none;
  }

  /// How many pending metadata rows to drain per [flushBatch] call. Kept small
  /// so a huge backlog (e.g. 93MB) never loads the whole Hive box into memory
  /// in one pass, which could OOM a low-end device and silently abort sync.
  static const int kBatchRows = 400;

  /// How many failed server attempts a row may survive before it is moved out
  /// of the pending queue into the `dead_letter` box. A row that keeps failing
  /// (bad enum, missing NOT NULL column, constraint violation) must not block
  /// the drain forever, but it is NEVER silently discarded — it is preserved
  /// for inspection via [deadLetterCount] / the `dead_letter` Hive box.
  static const int kMaxAttempts = 5;

  /// Durable, bounded drain used by the reconnect/auto-flush path. Pulls up to
  /// [kBatchRows] of the OLDEST pending rows and flushes them, immediately
  /// purging each accepted chunk (see [flushBatch]). Repeated calls therefore
  /// move through a large backlog across many small, crash-safe passes instead
  /// of one giant all-or-nothing attempt.
  Future<Map<String, dynamic>> flushBatch({
    required Future<Map<String, dynamic>> Function(String entity, List<dynamic> rows) onPush,
  }) async {
    final online = await isOnline;
    if (!online) return {'error': 'no_connection', 'flushed': 0};

    if (pendingCount == 0) return {'flushed': 0, 'applied': {}};

    // Oldest-first bounded subset — walked lazily, never the whole box.
    final subset = oldestPending(kBatchRows);
    if (subset.isEmpty) return {'flushed': 0, 'applied': {}};

    final Map<String, List<_SyncEntry>> byEntity = {};
    for (final item in subset) {
      final entity = item['entity'] as String?;
      final payload = item['payload'];
      if (entity == null || payload is! Map<String, dynamic>) continue;
      final boxKey = item['id'] as String? ?? '$entity:${payload['id']}';
      byEntity.putIfAbsent(entity, () => []).add((boxKey: boxKey, payload: payload));
    }

    final results = <String, dynamic>{};
    var flushed = 0;
    for (final entity in orderedEntities(byEntity.keys)) {
      final entries = byEntity[entity]!;
      final chunks = _chunkEntries(entries);
      var appliedTotal = 0;
      for (final chunk in chunks) {
        final res = await onPush(entity, chunk.map((e) => e.payload).toList());
        if (res['error'] != null) {
          results[entity] = {'applied': appliedTotal, 'error': 'chunk_failed'};
          break;
        }
        // Mark synced ONLY the rows the server actually accepted. `sync-push`
        // returns the per-row failure ids it derived from sync_apply conflicts
        // (interleaved failures are reported by id, not by position). Rows in
        // failed_ids stay pending so they are retried, never purged.
        final failedIds = <String>{
          if (res['failed_ids'] is List) ...(res['failed_ids'] as List).whereType<String>(),
        };
        final conflictReasons = <String, String>{};
        final conflicts = res['conflicts'];
        if (conflicts is List) {
          for (final c in conflicts) {
            if (c is Map && c['id'] is String && c['reason'] is String) {
              conflictReasons[c['id'] as String] = c['reason'] as String;
            }
          }
        }
        for (final entry in chunk) {
          final rowId = entry.payload['id']?.toString() ?? '';
          if (rowId.isNotEmpty && failedIds.contains(rowId)) {
            // Bounded retry: bumps attempts; once past kMaxAttempts the row is
            // moved to the dead-letter box and removed from pending_sync.
            await _handleFailedSync(entry.boxKey, conflictReasons[rowId] ?? 'server_rejected');
          } else {
            await markSynced(entry.boxKey);
          }
        }
        await purgeSynced();
        final a = res['applied'];
        appliedTotal += a is int ? a : 0;
        flushed += chunk.length;
        results[entity] = {
          'applied': appliedTotal,
          if (failedIds.isNotEmpty) 'failed_ids': failedIds.toList(),
        };
      }
    }

    return {'flushed': flushed, 'applied': results, 'remaining': pendingCount};
  }

  /// Best-effort full drain used at end-of-shift (clock out / timeout). Loops
  /// [flushBatch] passes until the queue is empty or connectivity drops, so even
  /// a multi-GB backlog is cleared in many small, crash-safe chunks rather than
  /// a single all-or-nothing pass. Stops on the first transport error so the
  /// caller can surface "still some queued" instead of blocking forever.
  Future<Map<String, dynamic>> flushBeforeShiftEnd({
    required Future<Map<String, dynamic>> Function(String entity, List<dynamic> rows) onPush,
    void Function(int remaining)? onProgress,
  }) async {
    var total = 0;
    var passes = 0;
    while (true) {
      final remaining = pendingCount;
      if (remaining == 0) break;
      if (!await isOnline) break;
      onProgress?.call(remaining);
      final res = await flushBatch(onPush: onPush);
      if (res['error'] != null) break;
      final flushed = res['flushed'];
      total += flushed is int ? flushed : 0;
      passes++;
      // Hard safety: never loop forever on a pathological queue.
      if (passes > 2000) break;
      if ((res['remaining'] ?? remaining) >= remaining && (flushed is int && flushed == 0)) {
        break; // no forward progress — avoid an infinite loop
      }
    }
    return {'flushed': total, 'remaining': pendingCount};
  }

  /// Drain the pending-binary queue (shelf photos). Called after a metadata
  /// flush so image bytes that failed at capture time get retried whenever the
  /// device is online. Returns how many binaries were confirmed uploaded; a
  /// failed upload is left in the queue for the next pass.
  ///
  /// Iterates the box keys lazily (one entry at a time) — never loads the whole
  /// pending_media box into memory.
  Future<int> flushPendingMedia({
    required Future<bool> Function(Map<String, dynamic> record) onUpload,
  }) async {
    final online = await isOnline;
    if (!online) return 0;
    var uploaded = 0;
    // Snapshot only the box KEYS (strings — cheap) so deleting an entry while
    // iterating never trips a concurrent-modification error; each VALUE is read
    // one at a time rather than materializing the whole pending_media box.
    for (final key in _pendingMediaBox.keys.toList()) {
      final v = _pendingMediaBox.get(key);
      if (v == null) continue;
      final item = (v as Map).map((k, val) => MapEntry(k.toString(), val));
      final ok = await onUpload(item);
      if (ok) {
        await _pendingMediaBox.delete(key);
        uploaded++;
      }
      // else: keep it queued for a later retry.
    }
    return uploaded;
  }
}

final SyncService syncService = SyncService.instance;
