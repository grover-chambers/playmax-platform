import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/sync_provider.dart';
import '../services/sync_service.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';

class SyncScreen extends StatelessWidget {
  const SyncScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncProvider>();
    final pending = sync.pendingCount;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 40),
          children: [
            const AppHeader(eyebrow: 'Offline queue', title: 'Sync'),
            // Sync failure card — errors are never silent: the rep sees the
            // reason and can retry immediately.
            if (sync.hasSyncErrors)
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
                    const Icon(Icons.sync_problem, color: Brand.stampRed, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        sync.lastSyncError ?? 'Sync failed',
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Brand.stampRed, fontSize: 12.5),
                      ),
                    ),
                    TextButton(
                      onPressed: UiFx.withTap(() => context.read<SyncProvider>().retry(), tick: UiFx.confirm),
                      child: const Text('Retry'),
                    ),
                    IconButton(
                      onPressed: () {
                        UiFx.tap();
                        context.read<SyncProvider>().clearSyncError();
                      },
                      icon: const Icon(Icons.close, size: 18),
                      tooltip: 'Dismiss',
                    ),
                  ],
                ),
              ),
            // Sync hero card
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
                          color: sync.isOnline ? Brand.stampGreen : Brand.stampRed,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          sync.isOnline ? '● Online' : '● Offline',
                          style: const TextStyle(
                            color: Colors.white,
                            fontFamily: Brand.fontMono,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                          ),
                        ),
                      ),
                      const Text(
                        'Queued locally until you sync',
                        style: TextStyle(color: Brand.paper, fontSize: 11, fontFamily: Brand.fontMono),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '$pending',
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
                    sync.isSyncing ? 'Syncing…' : 'Sync now',
                    onPressed: () => context.read<SyncProvider>().forceSync(),
                    loading: sync.isSyncing,
                  ),
                ],
              ),
            ),
            const SectionTitle('Queued'),
            if (pending == 0)
              const Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  'Queue is empty — everything is synced.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Brand.inkSoft, fontSize: 13),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    for (final item in syncService.pendingItems.take(50))
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: const BoxDecoration(
                          border: Border(bottom: BorderSide(color: Brand.lineStrong, width: 1)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text((item['entity'] as String? ?? 'item').toUpperCase(),
                                style: const TextStyle(fontSize: 12.5, fontFamily: Brand.fontMono, fontWeight: FontWeight.w700)),
                            Text((item['row_id'] as String? ?? '').substring(0, 8),
                                style: const TextStyle(color: Brand.inkSoft, fontSize: 11.5, fontFamily: Brand.fontMono)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}