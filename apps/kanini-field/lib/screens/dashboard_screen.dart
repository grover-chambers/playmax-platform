import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/census_provider.dart';
import '../providers/intercept_provider.dart';
import '../providers/sync_provider.dart';
import '../services/update_service.dart';
import '../data/field_guide.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';

/// Dashboard — the rep's day at a glance: mission & objective, live stats and
/// the day's tasks. Also the landing surface for the update alert and for
/// visible sync failures (fail-closed: nothing is swallowed silently).
class DashboardScreen extends StatefulWidget {
  /// Index of the destination tab when a task row is tapped
  /// (0 = submissions, 1 = census, 3 = intercepts). Null in tests.
  final ValueChanged<int>? onNavigate;

  const DashboardScreen({super.key, this.onNavigate});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Version-sync alert: fires once per dashboard mount (boot lands here).
    // Offline or unreachable `app_versions` fails silently to "no update".
    WidgetsBinding.instance.addPostFrameCallback((_) {
      updateService.promptIfAvailable(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final census = context.watch<CensusProvider>();
    final intercepts = context.watch<InterceptProvider>();
    final sync = context.watch<SyncProvider>();

    return ListView(
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        AppHeader(
          eyebrow: 'Field rep',
          title: 'Jambo, ${auth.displayName.split(' ').first}',
          subtitle: 'Your mission and objectives for today.',
        ),
        // Cluster strip: where the rep works and the number they are held to.
        if (auth.currentUser?.zone case final zone? when kClusters.containsKey(zone))
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: WarmCard(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Brand.amber.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      kClusters[zone]!.code,
                      style: const TextStyle(
                        color: Brand.amberDeep,
                        fontFamily: Brand.fontMono,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.1,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          zone,
                          style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w800, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${kRepNumbers.outletsPerDay} outlets/day · lead: ${kClusters[zone]!.lead}',
                          style: const TextStyle(color: Brand.inkSoft, fontSize: 11.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (sync.hasSyncErrors) _SyncErrorBanner(sync: sync),
        // Mission / objective banner
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Brand.ink,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Eyebrow('Mission', color: Brand.amber),
                const SizedBox(height: 6),
                const Text(
                  'Map every outlet, understand every shopper.',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  'Record outlets and intercepts accurately so the network team can route visits and drive activation.',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 13, height: 1.5),
                ),
              ],
            ),
          ),
        ),
        // Stats strip
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
          child: Row(
            children: [
              KpiTile('${census.todayCount}', 'Outlets'),
              const SizedBox(width: 10),
              KpiTile('${intercepts.todayCount}', 'Intercepts'),
              const SizedBox(width: 10),
              KpiTile('${sync.pendingCount}', 'To sync'),
            ],
          ),
        ),
        // Objective card
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: WarmCard(
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(color: Brand.amber, shape: BoxShape.circle),
                  child: const Icon(Icons.flag_outlined, color: Brand.ink),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Today's objective",
                          style: TextStyle(fontWeight: FontWeight.w800, color: Brand.ink, fontSize: 15)),
                      Text('Complete census captures and close your day by 6 PM.',
                          style: TextStyle(color: Brand.inkSoft, fontSize: 12.5)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SectionTitle('Tasks'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            children: [
              _TaskRow(
                icon: Icons.storefront_outlined,
                title: 'Census outlets',
                done: false,
                active: true,
                onTap: widget.onNavigate == null ? null : () => widget.onNavigate!(1),
              ),
              _TaskRow(
                icon: Icons.people_outline,
                title: 'Run intercepts',
                done: false,
                active: true,
                onTap: widget.onNavigate == null ? null : () => widget.onNavigate!(3),
              ),
              _TaskRow(
                icon: Icons.flag_outlined,
                title: 'Close day & submit',
                done: false,
                onTap: widget.onNavigate == null ? null : () => widget.onNavigate!(0),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Compact, visible sync-failure card with retry + dismiss. Without this the
/// queue can fail forever with no surface telling the rep why.
class _SyncErrorBanner extends StatelessWidget {
  final SyncProvider sync;
  const _SyncErrorBanner({required this.sync});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Container(
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
                maxLines: 3,
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
    );
  }
}

class _TaskRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final bool done;
  final bool active;
  final VoidCallback? onTap;
  const _TaskRow({required this.icon, required this.title, this.done = false, this.active = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    return WarmCard(
      child: InkWell(
        onTap: UiFx.withTap(onTap),
        borderRadius: BorderRadius.circular(12),
        child: Row(
          children: [
            Icon(icon, color: Brand.amberDeep, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink, fontSize: 14.5)),
            ),
            if (done)
              const StampTag(StampStatus.visited, label: 'Done')
            else if (active)
              const StampTag(StampStatus.pending, label: 'Now')
            else
              const Eyebrow('Later'),
            if (onTap != null) ...[
              const SizedBox(width: 6),
              const Icon(Icons.chevron_right, color: Brand.inkSoft, size: 20),
            ],
          ],
        ),
      ),
    );
  }
}