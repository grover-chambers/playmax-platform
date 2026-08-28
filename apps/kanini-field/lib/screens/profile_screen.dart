import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';

import '../data/field_guide.dart';
import '../providers/auth_provider.dart';
import '../providers/census_provider.dart';
import '../providers/intercept_provider.dart';
import '../providers/sync_provider.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';
import 'field_guide_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _version = 'v…';

  @override
  void initState() {
    super.initState();
    PackageInfo.fromPlatform().then((info) {
      if (!mounted) return;
      setState(() => _version = 'v${info.version}+${info.buildNumber}');
    }).catchError((_) {
      if (!mounted) return;
      setState(() => _version = 'v?');
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final census = context.watch<CensusProvider>();
    final intercepts = context.watch<InterceptProvider>();
    final sync = context.watch<SyncProvider>();

    final name = auth.displayName;
    final initials = name
        .split(' ')
        .where((p) => p.isNotEmpty)
        .map((p) => p[0])
        .take(2)
        .join()
        .toUpperCase();

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 40),
          children: [
            // Hero
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 34, 20, 20),
              child: Column(
                children: [
                  Container(
                    width: 74,
                    height: 74,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      border: Border.all(color: Brand.ink, width: 3),
                      shape: BoxShape.circle,
                    ),
                    child: Transform.rotate(
                      angle: -0.07,
                      child: Text(
                        initials.isEmpty ? 'N' : initials,
                        style: const TextStyle(
                          color: Brand.ink,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          fontFamily: Brand.fontMono,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Brand.ink)),
                  const SizedBox(height: 3),
                  const Text('Field rep · Offline-first', style: TextStyle(color: Brand.inkSoft, fontSize: 13)),
                ],
              ),
            ),
            // Stats
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  KpiTile('${census.capturedOutlets.length}', 'Outlets'),
                  const SizedBox(width: 10),
                  KpiTile('${intercepts.capturedIntercepts.length}', 'Intercepts'),
                  const SizedBox(width: 10),
                  KpiTile('${sync.pendingCount}', 'To sync'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            // Cluster card: where the rep works, who leads them, their number.
            if (auth.currentUser?.zone case final zone? when kClusters.containsKey(zone)) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: WarmCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
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
                            child: Text(
                              zone,
                              style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w800, fontSize: 15),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _GuideLine('Lead', kClusters[zone]!.lead),
                      const SizedBox(height: 6),
                      _GuideLine('Target', '${kRepNumbers.outletsPerDay} outlets/day · ${kRepNumbers.perWave} per wave'),
                      const SizedBox(height: 12),
                      const Text(
                        'YOUR AREAS',
                        style: TextStyle(
                          color: Brand.inkSoft,
                          fontFamily: Brand.fontMono,
                          fontSize: 9.5,
                          letterSpacing: 0.12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final area in kClusters[zone]!.areas)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                              decoration: BoxDecoration(
                                color: Brand.ink.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Brand.line),
                              ),
                              child: Text(area, style: const TextStyle(color: Brand.ink, fontSize: 11)),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            // Details
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: _ProfileRow(keyLabel: 'Role', value: 'Field Rep'),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: _ProfileRow(keyLabel: 'Sync', value: 'Local queue'),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _ProfileRow(keyLabel: 'App', value: _version),
            ),
            // Field guide
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: WarmCard(
                child: InkWell(
                  onTap: () {
                    UiFx.tap();
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const FieldGuideScreen()),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Icon(Icons.menu_book_outlined, color: Brand.amberDeep, size: 22),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Field Guide',
                            style: TextStyle(color: Brand.ink, fontWeight: FontWeight.w700, fontSize: 14.5),
                          ),
                        ),
                        Icon(Icons.chevron_right, color: Brand.inkSoft, size: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            // Log out
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
              child: AmberButton(
                'Log out',
                outlined: true,
                color: Brand.card,
                onPressed: () {
                  UiFx.confirm();
                  context.read<AuthProvider>().signOut();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final String keyLabel;
  final String value;
  const _ProfileRow({required this.keyLabel, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Brand.line, width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(keyLabel, style: const TextStyle(color: Brand.inkSoft)),
          Text(value, style: const TextStyle(fontFamily: Brand.fontMono, fontWeight: FontWeight.w700, color: Brand.ink)),
        ],
      ),
    );
  }
}

class _GuideLine extends StatelessWidget {
  final String label;
  final String value;
  const _GuideLine(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 58,
          child: Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: Brand.inkSoft,
              fontFamily: Brand.fontMono,
              fontSize: 9.5,
              letterSpacing: 0.1,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(color: Brand.ink, fontSize: 13, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}