import 'dart:io';

import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'sync_service.dart';

/// Recovery: brute-read the local Hive cache and force-send it to the census DB.
/// Used when a large backlog (e.g. 93MB at Joska) is stuck and the normal
/// chunked flush shows 0 progress.
///
/// Unlike the legacy brute-force path (raw PostgREST upsert that bypassed every
/// V10 fix), recovery now routes through the SAME `sync-push` edge function as
/// the normal flush, so every row gets:
///   - auth-uid -> profile-id rewrite,
///   - visit outcome normalization,
///   - retailer self-heal,
///   - `sync_apply` column filtering + idempotent upsert.
///
/// Strategy:
///  1. Read entries from the `pending_sync` Hive box (even if SyncService thinks
///     pendingCount==0 due to a transient open failure).
///  2. If Hive is empty/corrupted, fall back to raw file read of pending_sync.hive.
///  3. Group by entity, order parent-before-child, and push via `sync-push`
///     (chunked to 1.5MB via [SyncService.chunkRows], same body-limit safety).
///  4. Backup raw .hive + pending_media.hive to the private `diagnostics`
///     bucket so the server has a copy to pull even if the edge path fails.
class RecoveryService {
  RecoveryService._();
  static final RecoveryService instance = RecoveryService._();

  Future<Map<String, dynamic>> recover({
    void Function(String msg)? onProgress,
  }) async {
    final client = Supabase.instance.client;
    void log(String m) => onProgress?.call(m);

    // 0) Honest error if not signed in — recovery needs a valid session JWT.
    if (client.auth.currentSession == null) {
      return {'recovered': 0, 'message': 'Not signed in — recovery needs an active session.'};
    }
    String? deviceId;
    try {
      final res = await client.functions.invoke('sync-push', body: {'probe': true});
      // The edge function rejects probes without a batch; a probe is only used
      // to warm the function. Ignore its response.
      res;
      deviceId = 'recovery';
    } catch (e) {
      deviceId = 'recovery';
    }

    // 1) Collect pending rows — primary: Hive box (opened UNTYPED + per-key
    //    read so a Map<dynamic,dynamic> value never trips a typed iterator cast)
    List<Map<String, dynamic>> items = [];
    try {
      final box = Hive.isBoxOpen('pending_sync')
          ? Hive.box('pending_sync')
          : await Hive.openBox('pending_sync');
      for (final key in box.keys) {
        final v = box.get(key);
        if (v == null) continue;
        try {
          items.add(_normalizeMap(v));
        } catch (_) {
          // Quarantine only the invalid row; keep the rest.
        }
      }
      log('Hive pending_sync: ${items.length} items (${_boxBytes(box)} bytes on disk)');
    } catch (e) {
      log('Hive open failed: $e — trying raw file');
    }

    // 2) Fallback: raw file size probe (diagnostic only — we still push via edge)
    String? hivePath;
    int hiveBytes = 0;
    try {
      final dir = await getApplicationDocumentsDirectory();
      final f = File('${dir.path}/hive/pending_sync.hive');
      if (await f.exists()) {
        hivePath = f.path;
        hiveBytes = await f.length();
        log('Raw hive file: $hivePath (${(hiveBytes / 1024 / 1024).toStringAsFixed(2)} MB)');
        if (items.isEmpty && hiveBytes > 0) {
          log('Hive box empty but file has bytes — box may be corrupted; raw upload will preserve it');
        }
      }
      final alt = File('${dir.path}/pending_sync.hive');
      if (hivePath == null && await alt.exists()) {
        hivePath = alt.path;
        hiveBytes = await alt.length();
        log('Alt hive file: $hivePath (${(hiveBytes / 1024 / 1024).toStringAsFixed(2)} MB)');
      }
    } catch (e) {
      log('Raw file probe failed: $e');
    }

    // 3) Upload raw files to diagnostics bucket as backup (best-effort).
    if (hivePath != null && hiveBytes > 0) {
      try {
        final bytes = await File(hivePath).readAsBytes();
        final userId = client.auth.currentUser?.id ?? 'unknown';
        final key = 'recovery/${userId}_${DateTime.now().toUtc().toIso8601String().replaceAll(':', '-')}.hive';
        await client.storage.from('diagnostics').uploadBinary(key, bytes,
            fileOptions: const FileOptions(upsert: true, contentType: 'application/octet-stream'));
        log('Diagnostics backup uploaded: $key');
      } catch (e) {
        log('Diagnostics upload failed (non-blocking): $e');
      }
      try {
        final dir = await getApplicationDocumentsDirectory();
        for (final name in ['pending_media.hive', 'hive/pending_media.hive']) {
          final mf = File('${dir.path}/$name');
          if (await mf.exists() && await mf.length() > 0) {
            final b = await mf.readAsBytes();
            final uid = client.auth.currentUser?.id ?? 'unknown';
            await client.storage.from('diagnostics').uploadBinary(
                'recovery/${uid}_pending_media.hive', b,
                fileOptions: const FileOptions(upsert: true));
            log('pending_media backup uploaded');
            break;
          }
        }
      } catch (_) {}
    }

    if (items.isEmpty) {
      return {
        'recovered': 0,
        'hiveBytes': hiveBytes,
        'message':
            'No pending_sync items found — cache may already be empty or was cleared. Raw file ${hiveBytes > 0 ? 'backed up' : 'not found'}.',
      };
    }

    // 4) Build entity -> payload map from the queued items, ordered so parents
    //    land before children (same ordering guarantee as the normal flush).
    //    We keep BOTH the box key (`$entity:$rowId`) and the payload's row uuid:
    //    the edge function reports failures by payload id, while Hive entries
    //    are keyed `$entity:<uuid>` — the two must be mapped correctly so only
    //    applied rows get marked synced.
    final byEntity = <String, List<Map<String, dynamic>>>{};
    final payloadIdsByEntity = <String, List<String>>{};
    for (final it in items) {
      final entity = it['entity'] as String?;
      final payload = it['payload'];
      if (entity == null || payload is! Map) continue;
      final payloadMap = Map<String, dynamic>.from(payload);
      byEntity.putIfAbsent(entity, () => []).add(payloadMap);
      payloadIdsByEntity
          .putIfAbsent(entity, () => [])
          .add(payloadMap['id']?.toString() ?? '');
    }

    int totalApplied = 0;
    final errors = <String>[];
    for (final entity in SyncService.orderedEntities(byEntity.keys)) {
      final rows = byEntity[entity]!;
      final payloadIds = payloadIdsByEntity[entity] ?? [];
      log('Recovering $entity: ${rows.length} rows');
      final chunks = SyncService.chunkRows(rows);
      var idCursor = 0;
      for (var i = 0; i < chunks.length; i++) {
        final chunk = chunks[i];
        // Route through the SAME healed edge path as normal sync — never raw
        // PostgREST, so the id rewrite / outcome normalize / retailer self-heal
        // / sync_apply all apply.
        try {
          final res = await client.functions.invoke('sync-push', body: {
            'device_id': deviceId,
            'batch': [
              {'entity': entity, 'rows': chunk},
            ],
          });
          final data = res.data;
          if (data is Map && data['error'] != null) {
            final e = data['error'];
            final msg = '$entity chunk ${i + 1} rejected: $e';
            log(msg);
            errors.add(msg);
            continue;
          }
          final applied = (data is Map ? data['applied'] : 0);
          final n = applied is int ? applied : chunk.length;
          totalApplied += n;
          log('  $entity chunk ${i + 1}: $n applied');
          // Mark ONLY the rows whose payload id is NOT in failed_ids, so a bad
          // row (or an interleaved failure) stays queued instead of being
          // purged as if it had landed. The box key is `$entity:<uuid>`.
          final failedIds = <String>{
            if (data is Map && data['failed_ids'] is List)
              ...(data['failed_ids'] as List).whereType<String>(),
          };
          final chunkPayloadIds = payloadIds.sublist(
            idCursor,
            (idCursor + chunk.length).clamp(0, payloadIds.length),
          );
          for (final rowId in chunkPayloadIds) {
            if (rowId.isEmpty || failedIds.contains(rowId)) continue; // stays queued
            await _markSynced(entity, rowId);
          }
          idCursor += chunk.length;
        } catch (e) {
          final msg = '$entity chunk ${i + 1} failed: $e';
          log(msg);
          errors.add(msg);
          // Continue to next chunk — don't abort whole recovery on one bad row.
        }
      }
    }

    // Purge synced entries so SyncScreen shows empty queue.
    try {
      await _purgeSynced();
    } catch (_) {}

    return {
      'recovered': totalApplied,
      'hiveBytes': hiveBytes,
      'errors': errors,
      'byEntity': byEntity.map((k, v) => MapEntry(k, v.length)),
    };
  }

  Future<void> _markSynced(String entity, String rowId) async {
    try {
      final box = Hive.isBoxOpen('pending_sync')
          ? Hive.box('pending_sync')
          : await Hive.openBox('pending_sync');
      final key = '$entity:$rowId';
      final existing = box.get(key);
      if (existing is Map) {
        await box.put(key, {...existing, 'synced': true});
      }
    } catch (_) {}
  }

  Future<void> _purgeSynced() async {
    try {
      final box = Hive.isBoxOpen('pending_sync')
          ? Hive.box('pending_sync')
          : await Hive.openBox('pending_sync');
      for (final k in box.keys.toList()) {
        final v = box.get(k);
        if (v is Map && v['synced'] == true) await box.delete(k);
      }
    } catch (_) {}
  }

  int _boxBytes(Box box) {
    try {
      return box.values.fold<int>(0, (sum, v) => sum + '$v'.length);
    } catch (_) {
      return 0;
    }
  }

  /// Recursively normalize a Hive `Map<dynamic, dynamic>` into
  /// `Map<String, dynamic>` (keys converted to String; non-String keys dropped).
  static Map<String, dynamic> _normalizeMap(dynamic value) {
    if (value is! Map) return {};
    final out = <String, dynamic>{};
    for (final e in value.entries) {
      if (e.key is String) {
        out[e.key as String] = _normalizeValue(e.value);
      }
    }
    return out;
  }

  static dynamic _normalizeValue(dynamic value) {
    if (value is Map) {
      final out = <String, dynamic>{};
      for (final e in value.entries) {
        if (e.key is String) out[e.key as String] = _normalizeValue(e.value);
      }
      return out;
    }
    if (value is List) return value.map(_normalizeValue).toList();
    return value;
  }
}