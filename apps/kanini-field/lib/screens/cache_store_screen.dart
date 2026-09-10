import 'dart:async';

import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../services/recovery_service.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';

/// Recursively normalize a Hive `Map<dynamic, dynamic>` into
/// `Map<String, dynamic>` (keys converted to String; non-String keys dropped).
Map<String, dynamic> _normalizeMap(dynamic value) {
  if (value is! Map) return {};
  final out = <String, dynamic>{};
  for (final e in value.entries) {
    if (e.key is String) {
      out[e.key as String] = _normalizeValue(e.value);
    }
  }
  return out;
}

dynamic _normalizeValue(dynamic value) {
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

/// Cache Store — live view of the on-device Hive queue with a one-tap
/// "Confirm & Upload" that drains everything through the healed sync-push
/// pipeline (id-rewrite, outcome normalize, retailer self-heal, sync_apply).
class CacheStoreScreen extends StatefulWidget {
  const CacheStoreScreen({super.key});

  @override
  State<CacheStoreScreen> createState() => _CacheStoreScreenState();
}

class _CacheStoreScreenState extends State<CacheStoreScreen> {
  Timer? _refreshTimer;
  List<Map<String, dynamic>> _pendingItems = [];
  List<Map<String, dynamic>> _pendingMedia = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCache();
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) => _loadCache());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadCache() async {
    try {
      final items = <Map<String, dynamic>>[];
      final media = <Map<String, dynamic>>[];

      // pending_sync box (opened untyped + per-key read so a Map<dynamic,dynamic>
      // value never trips a typed iterator cast)
      if (Hive.isBoxOpen('pending_sync')) {
        final box = Hive.box('pending_sync');
        for (final key in box.keys) {
          final v = box.get(key);
          if (v == null) continue;
          try {
            items.add(_normalizeMap(v));
          } catch (_) {
            // skip only the invalid row
          }
        }
      }

      // pending_media box
      if (Hive.isBoxOpen('pending_media')) {
        final box = Hive.box('pending_media');
        for (final key in box.keys) {
          final v = box.get(key);
          if (v == null) continue;
          try {
            media.add(_normalizeMap(v));
          } catch (_) {
            // skip only the invalid row
          }
        }
      }

      if (mounted) {
        setState(() {
          _pendingItems = items;
          _pendingMedia = media;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Failed to read cache: $e';
        });
      }
    }
  }

  Future<void> _confirmAndUpload() async {
    UiFx.confirm();
    setState(() => _loading = true);

    try {
      // Use the recovery service which routes through the SAME healed sync-push
      // pipeline + backs up raw .hive files to diagnostics bucket.
      final res = await RecoveryService.instance.recover(
        onProgress: (msg) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
          }
        },
      );

      final recovered = res['recovered'] ?? 0;
      final errors = (res['errors'] as List?)?.length ?? 0;
      final hiveBytes = res['hiveBytes'] ?? 0;

      await _loadCache();

      if (mounted) {
        UiFx.stamp();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload complete: $recovered rows recovered'
                '${errors > 0 ? " · $errors chunk(s) had errors" : ""}'
                '${hiveBytes > 0 ? " · ${(hiveBytes / 1024 / 1024).toStringAsFixed(2)} MB backed up" : ""}'),
            backgroundColor: Brand.stampGreen,
          ),
        );
      }
    } catch (e) {
      UiFx.reject();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e'), backgroundColor: Brand.stampRed),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, int> _groupByEntity(List<Map<String, dynamic>> items) {
    final map = <String, int>{};
    for (final item in items) {
      final entity = (item['entity'] as String?) ?? 'unknown';
      map[entity] = (map[entity] ?? 0) + 1;
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final unsyncedCount = _pendingItems.where((v) => v['synced'] != true).length;
    final syncedCount = _pendingItems.where((v) => v['synced'] == true).length;
    final byEntity = _groupByEntity(_pendingItems.where((v) => v['synced'] != true).toList());
    final mediaCount = _pendingMedia.length;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 40),
          children: [
            AppHeader(
              eyebrow: 'Offline cache',
              title: 'Cache store',
              subtitle: '$unsyncedCount unsynced · $syncedCount synced · $mediaCount media',
            ),

            if (_error != null)
              Container(
                margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFBE9E7),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Brand.stampRed, width: 1),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Brand.stampRed, size: 20),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_error!, style: const TextStyle(color: Brand.stampRed, fontSize: 12.5))),
                  ],
                ),
              ),

            // Hero card with confirm & upload
            Container(
              margin: const EdgeInsets.fromLTRB(20, 4, 20, 4),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Brand.ink,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: unsyncedCount > 0 ? Brand.stampAmber : Brand.stampGreen,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          unsyncedCount > 0 ? '● Pending' : '● Empty',
                          style: const TextStyle(
                            color: Colors.white,
                            fontFamily: Brand.fontMono,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                          ),
                        ),
                      ),
                      Text(
                        'Tap to send everything via healed pipeline',
                        style: const TextStyle(color: Brand.paper, fontSize: 11, fontFamily: Brand.fontMono),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '$unsyncedCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontFamily: Brand.fontMono,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                  const Text(
                    'items waiting to upload',
                    style: TextStyle(color: Brand.paper, fontSize: 11.5),
                  ),
                  const SizedBox(height: 14),
                  AmberButton(
                    _loading ? 'Reading cache…' : (unsyncedCount == 0 ? 'Cache empty' : 'Confirm & upload all'),
                    onPressed: unsyncedCount == 0 || _loading ? null : _confirmAndUpload,
                    loading: _loading,
                    color: unsyncedCount == 0 ? Brand.pendingGrey : null,
                  ),
                ],
              ),
            ),

            // Entity breakdown
            if (byEntity.isNotEmpty) ...[
              const SectionTitle('By entity'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final entry in byEntity.entries.toList()
                      ..sort((a, b) => b.value.compareTo(a.value)))
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Brand.card,
                          border: Border.all(color: Brand.line, width: 1.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(entry.key.toUpperCase(),
                                style: const TextStyle(fontSize: 11.5, fontFamily: Brand.fontMono, fontWeight: FontWeight.w700)),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Brand.ink,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text('${entry.value}',
                                  style: const TextStyle(color: Brand.paper, fontSize: 11.5, fontFamily: Brand.fontMono, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],

            // Media queue
            if (mediaCount > 0) ...[
              const SectionTitle('Pending media (photos)'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    for (final item in _pendingMedia.take(20))
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: const BoxDecoration(
                          border: Border(bottom: BorderSide(color: Brand.lineStrong, width: 1)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                (item['entity'] as String? ?? 'media').toUpperCase(),
                                style: const TextStyle(fontSize: 12.5, fontFamily: Brand.fontMono, fontWeight: FontWeight.w700),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              (item['row_id'] as String? ?? '').substring(0, 8),
                              style: const TextStyle(color: Brand.inkSoft, fontSize: 11.5, fontFamily: Brand.fontMono),
                            ),
                          ],
                        ),
                      ),
                    if (_pendingMedia.length > 20)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '+ ${_pendingMedia.length - 20} more…',
                          style: const TextStyle(color: Brand.inkSoft, fontSize: 11, fontFamily: Brand.fontMono),
                        ),
                      ),
                  ],
                ),
              ),
            ],

            // Full item list (unsynced)
            if (unsyncedCount > 0) ...[
              const SectionTitle('All queued items (unsynced)'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    for (final item in _pendingItems.where((v) => v['synced'] != true))
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: const BoxDecoration(
                          border: Border(bottom: BorderSide(color: Brand.lineStrong, width: 1)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    (item['entity'] as String? ?? 'item').toUpperCase(),
                                    style: const TextStyle(fontSize: 12, fontFamily: Brand.fontMono, fontWeight: FontWeight.w700),
                                  ),
                                  Text(
                                    'row: ${(item['row_id'] as String? ?? '').substring(0, 12)} · ${item['created_at'] != null ? DateTime.parse(item['created_at'] as String).toLocal().toString().substring(0, 19) : 'no time'}',
                                    style: const TextStyle(color: Brand.inkSoft, fontSize: 10, fontFamily: Brand.fontMono),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Brand.stampAmber.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('QUEUED',
                                  style: TextStyle(fontSize: 8.5, fontFamily: Brand.fontMono, fontWeight: FontWeight.w800, color: Brand.stampAmber)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ] else if (!_loading) ...[
              const SectionTitle('Cache'),
              const Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Cache is empty — everything is synced.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Brand.inkSoft, fontSize: 13),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}