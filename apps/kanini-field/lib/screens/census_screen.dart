import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/outlet_model.dart';
import '../providers/census_provider.dart';
import '../theme/brand.dart';
import '../widgets/warm.dart';
import 'outlet_census_flow.dart';

/// Census — field data collection. Captures NEW outlets (raw market data) and
/// lists what has been recorded on this device today.
class CensusScreen extends StatefulWidget {
  const CensusScreen({super.key});

  @override
  State<CensusScreen> createState() => _CensusScreenState();
}

class _CensusScreenState extends State<CensusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CensusProvider>().init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final census = context.watch<CensusProvider>();

    return ListView(
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        const AppHeader(
          eyebrow: 'Field data collection',
          title: 'Outlet census',
          subtitle: 'Capture new outlets you find in the field.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 6),
          child: Row(
            children: [
              KpiTile('${census.capturedOutlets.length}', 'Captured'),
              const SizedBox(width: 10),
              KpiTile('${census.todayCount}', 'Today', numberColor: Brand.amberDeep),
            ],
          ),
        ),
        // New census action
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: WarmCard(
            onTap: () async {
              census.resetDraft();
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const OutletCensusFlow()));
            },
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: const BoxDecoration(color: Brand.amber, shape: BoxShape.circle),
                  child: const Icon(Icons.add, color: Brand.ink),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Start a new census',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Brand.ink)),
                      Text('Shop profile · contact · categories',
                          style: TextStyle(color: Brand.inkSoft, fontSize: 12.5)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Brand.inkSoft),
              ],
            ),
          ),
        ),
        SectionTitle('Captured outlets', trailing: '${census.capturedOutlets.length}'),
        if (census.capturedOutlets.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text('No outlets captured yet. Tap above to start.',
                style: TextStyle(color: Brand.inkSoft, fontSize: 13)),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                for (final o in census.capturedOutlets.reversed) _OutletRow(outlet: o),
              ],
            ),
          ),
      ],
    );
  }
}

class _OutletRow extends StatelessWidget {
  final OutletModel outlet;
  const _OutletRow({required this.outlet});

  @override
  Widget build(BuildContext context) {
    final d = DateFormat('dd MMM HH:mm');
    return WarmCard(
      child: Row(
        children: [
          const Icon(Icons.storefront, color: Brand.amberDeep),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(outlet.businessName,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, color: Brand.ink)),
                Text('${outlet.ward} · ${d.format(outlet.createdAt.toLocal())}',
                    style: const TextStyle(color: Brand.inkSoft, fontSize: 12)),
              ],
            ),
          ),
          const StampTag(StampStatus.visited, label: 'Saved'),
        ],
      ),
    );
  }
}