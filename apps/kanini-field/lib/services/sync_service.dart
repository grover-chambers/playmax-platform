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
      final res = await onPush(entity, byEntity[entity]!);
      results[entity] = res;
      // A server-side error (edge-function failure, rejected batch, auth
      // problem) must NOT mark the entity's rows as synced: they stay in the
      // queue so a retry can push them, and the caller surfaces the error.
      if (res['error'] != null) {
        failedEntities.add(entity);
      }
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
