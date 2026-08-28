import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/consumer_intercept_model.dart';
import '../providers/intercept_provider.dart';
import '../theme/brand.dart';
import '../widgets/warm.dart';
import 'consumer_intercept_flow.dart';

/// Consumer intercepts — anonymous shopper surveys captured in the field.
class InterceptScreen extends StatefulWidget {
  const InterceptScreen({super.key});

  @override
  State<InterceptScreen> createState() => _InterceptScreenState();
}

class _InterceptScreenState extends State<InterceptScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InterceptProvider>().init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final intercepts = context.watch<InterceptProvider>();

    return ListView(
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        const AppHeader(
          eyebrow: 'Anonymous shopper survey',
          title: 'Consumer intercepts',
          subtitle: 'Unaided → aided brand awareness capture.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 6),
          child: Row(
            children: [
              KpiTile('${intercepts.capturedIntercepts.length}', 'Captured'),
              const SizedBox(width: 10),
              KpiTile('${intercepts.todayCount}', 'Today', numberColor: Brand.amberDeep),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: WarmCard(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ConsumerInterceptFlow())),
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
                      Text('Start a new intercept',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Brand.ink)),
                      Text('Shopper demographic · awareness',
                          style: TextStyle(color: Brand.inkSoft, fontSize: 12.5)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Brand.inkSoft),
              ],
            ),
          ),
        ),
        SectionTitle('Captured intercepts', trailing: '${intercepts.capturedIntercepts.length}'),
        if (intercepts.capturedIntercepts.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text('No intercepts captured yet. Tap above to start.',
                style: TextStyle(color: Brand.inkSoft, fontSize: 13)),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                for (final i in intercepts.capturedIntercepts.reversed) _InterceptRow(intercept: i),
              ],
            ),
          ),
      ],
    );
  }
}

class _InterceptRow extends StatelessWidget {
  final ConsumerInterceptModel intercept;
  const _InterceptRow({required this.intercept});

  @override
  Widget build(BuildContext context) {
    final d = DateFormat('dd MMM HH:mm');
    return WarmCard(
      child: Row(
        children: [
          const Icon(Icons.person_outline, color: Brand.amberDeep),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${intercept.ward} · ${intercept.channelContextCode}',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, color: Brand.ink)),
                Text('HH ${intercept.householdSizeBand ?? '—'} · ${d.format(intercept.capturedAt.toLocal())}',
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