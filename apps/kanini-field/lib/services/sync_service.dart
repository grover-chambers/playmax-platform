import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Offline-first v1 sync queue: stages outgoing payloads in a Hive box keyed
/// by `entity:row-id` and flushes them to the server (via the `sync-push`
/// edge function) when the device is online.
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

  late Box<Map<String, dynamic>> _pendingSyncBox;
  bool _ready = false;

  Future<void> init() async {
    if (_ready) return;
    _pendingSyncBox = await Hive.openBox<Map<String, dynamic>>('pending_sync');
    _ready = true;
  }

  bool get isReady => _ready;

  Box<Map<String, dynamic>> get pendingSyncBox => _pendingSyncBox;

  /// Enqueue a row for [entity]. Last-write-wins on the local queue: an
  /// entry with the same `[entity]:[rowId]` key is replaced.
  Future<void> enqueueSync(String entity, String rowId, Map<String, dynamic> row) async {
    await _pendingSyncBox.put('$entity:$rowId', {
      'id': '$entity:$rowId',
      'entity': entity,
      'row_id': rowId,
      'payload': row,
      'synced': false,
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

  /// All entries that have not yet been synced.
  List<Map<String, dynamic>> get pendingItems => _pendingSyncBox.values
      .where((v) => v['synced'] != true)
      .map((v) => Map<String, dynamic>.from(v))
      .toList();

  int get pendingCount => pendingItems.length;

  Future<bool> get isOnline async {
    final results = await Connectivity().checkConnectivity();
    return results != ConnectivityResult.none;
  }

  /// Flush all pending items via the [onPush] callback (wired to the
  /// `sync-push` edge function by the caller).
  ///
  /// Returns a map of `entity -> server response` plus a `flushed` count.
  Future<Map<String, dynamic>> flush({
    required Future<Map<String, dynamic>> Function(String entity, List<dynamic> rows) onPush,
  }) async {
    final online = await isOnline;
    if (!online) return {'error': 'no_connection', 'flushed': 0};

    final pending = pendingItems;
    if (pending.isEmpty) return {'flushed': 0, 'applied': {}};

    final Map<String, List<Map<String, dynamic>>> byEntity = {};
    for (final item in pending) {
      final entity = item['entity'] as String?;
      final payload = item['payload'];
      if (entity == null || payload is! Map<String, dynamic>) continue;
      byEntity.putIfAbsent(entity, () => []).add(payload);
    }

    final results = <String, dynamic>{};
    final failedEntities = <String>{};
    for (final entity in orderedEntities(byEntity.keys)) {
      final entityRows = byEntity[entity]!;
      // Split into size-safe chunks so a large backlog never exceeds the
      // Supabase Edge Function request-body limit (which currently fails the
      // whole sync and leaves rows stranded on device).
      final chunks = chunkRows(entityRows);
      var allOk = true;
      var appliedTotal = 0;
      for (var i = 0; i < chunks.length; i++) {
        final res = await onPush(entity, chunks[i]);
        // A server-side error (edge-function failure, rejected batch, auth
        // problem) must NOT mark the chunk's rows as synced: they stay in the
        // queue so a retry can push them, and the caller surfaces the error.
        if (res['error'] != null) {
          failedEntities.add(entity);
          allOk = false;
          break; // stop this entity; remaining chunks retry next flush
        }
        final a = res['applied'];
        appliedTotal += a is int ? a : 0;
      }
      results[entity] = allOk ? {'applied': appliedTotal} : {'error': 'chunk_failed'};
    }

    for (final item in pending) {
      final entity = item['entity'] as String?;
      if (entity != null && failedEntities.contains(entity)) continue;
      await markSynced(item['id'] as String);
    }

    return {'flushed': pending.length, 'applied': results};
  }
}

final SyncService syncService = SyncService.instance;
