import 'dart:io';

import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Recovery: brute-read the local Hive cache and force-send it to the census DB,
/// bypassing the normal edge-function path. Used when a large backlog (e.g. 93MB
/// at Joska) is stuck and the normal chunked flush shows 0 progress.
///
/// Strategy:
///  1. Read every entry from the `pending_sync` Hive box (even if SyncService thinks
///     pendingCount==0 due to a transient open failure).
///  2. If Hive is empty/corrupted, fall back to raw file read of pending_sync.hive.
///  3. Group by entity and upsert directly via PostgREST (onConflict=id) in
///     500-row chunks — no edge-function body limit.
///  4. In parallel, upload the raw .hive file to the private `diagnostics` bucket
///     so the server has a backup even if REST fails.
class RecoveryService {
  RecoveryService._();
  static final RecoveryService instance = RecoveryService._();

  /// How many rows per direct REST upsert. 500 is well under PostgREST limits
  /// and keeps each request <2MB.
  static const int kDirectBatchSize = 500;

  Future<Map<String, dynamic>> recover({
    void Function(String msg)? onProgress,
  }) async {
    final client = Supabase.instance.client;
    void log(String m) => onProgress?.call(m);

    // 1) Collect pending rows — primary: Hive box
    List<Map<String, dynamic>> items = [];
    try {
      final box = Hive.isBoxOpen('pending_sync')
          ? Hive.box<Map<String, dynamic>>('pending_sync')
          : await Hive.openBox<Map<String, dynamic>>('pending_sync');
      items = box.values.map((v) => Map<String, dynamic>.from(v)).toList();
      log('Hive pending_sync: ${items.length} items');
    } catch (e) {
      log('Hive open failed: $e — trying raw file');
    }

    // 2) Fallback: raw file size probe (diagnostic only — we still try REST)
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
      // Also check alternate HiveFlutter path
      final alt = File('${dir.path}/pending_sync.hive');
      if (hivePath == null && await alt.exists()) {
        hivePath = alt.path;
        hiveBytes = await alt.length();
        log('Alt hive file: $hivePath (${(hiveBytes / 1024 / 1024).toStringAsFixed(2)} MB)');
      }
    } catch (e) {
      log('Raw file probe failed: $e');
    }

    // 3) Upload raw file to diagnostics bucket as backup (best-effort)
    if (hivePath != null && hiveBytes > 0) {
      try {
        final file = File(hivePath);
        final bytes = await file.readAsBytes();
        final userId = client.auth.currentUser?.id ?? 'unknown';
        final key = 'recovery/${userId}_${DateTime.now().toUtc().toIso8601String().replaceAll(':', '-')}.hive';
        // diagnostics bucket must exist and be private; service will create if missing
        await client.storage.from('diagnostics').uploadBinary(key, bytes,
            fileOptions: const FileOptions(upsert: true, contentType: 'application/octet-stream'));
        log('Diagnostics backup uploaded: $key');
      } catch (e) {
        log('Diagnostics upload failed (non-blocking): $e');
      }
      // Also try pending_media hive file
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
      return {'recovered': 0, 'hiveBytes': hiveBytes, 'message': 'No pending_sync items found — cache may already be empty or was cleared. Raw file ${hiveBytes > 0 ? "backed up" : "not found"}.'};
    }

    // 4) Group by entity and direct upsert via PostgREST
    final byEntity = <String, List<Map<String, dynamic>>>{};
    for (final it in items) {
      final entity = it['entity'] as String?;
      final payload = it['payload'];
      if (entity == null || payload is! Map) continue;
      byEntity.putIfAbsent(entity, () => []).add(Map<String, dynamic>.from(payload as Map));
    }

    int totalApplied = 0;
    final errors = <String>[];
    for (final entry in byEntity.entries) {
      final entity = entry.key;
      final rows = entry.value;
      log('Recovering $entity: ${rows.length} rows');
      for (var i = 0; i < rows.length; i += kDirectBatchSize) {
        final chunk = rows.sublist(i, (i + kDirectBatchSize).clamp(0, rows.length) as int);
        try {
          // Direct PostgREST upsert — idempotent on id
          await client.from(entity).upsert(chunk, onConflict: 'id');
          // Postgrest returns List on success; count chunk as applied
          totalApplied += chunk.length;
          log('  $entity chunk ${i ~/ kDirectBatchSize + 1}: ${chunk.length} upserted');
          // Mark chunk as synced in local Hive so normal flush won't re-send
          for (final r in chunk) {
            final id = r['id'] as String?;
            if (id != null) {
              try {
                final box = Hive.box<Map<String, dynamic>>('pending_sync');
                final key = '$entity:$id';
                final existing = box.get(key);
                if (existing != null) await box.put(key, {...existing, 'synced': true});
              } catch (_) {}
            }
          }
        } catch (e) {
          final msg = '$entity chunk ${i ~/ kDirectBatchSize + 1} failed: $e';
          log(msg);
          errors.add(msg);
          // Continue to next chunk — don't abort whole recovery on one bad row
        }
      }
    }

    // Purge synced entries so SyncScreen shows empty queue
    try {
      final box = Hive.box<Map<String, dynamic>>('pending_sync');
      for (final k in box.keys.toList()) {
        final v = box.get(k);
        if (v != null && v['synced'] == true) await box.delete(k);
      }
    } catch (_) {}

    return {
      'recovered': totalApplied,
      'hiveBytes': hiveBytes,
      'errors': errors,
      'byEntity': byEntity.map((k, v) => MapEntry(k, v.length)),
    };
  }
}
