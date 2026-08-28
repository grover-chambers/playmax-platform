import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/route_master.dart';
import '../providers/route_master_provider.dart';
import '../providers/sync_provider.dart';
import '../theme/brand.dart';
import '../widgets/warm.dart';

/// Visits tab — shows the rep's assigned routes from the master data
/// (seeded from the Nampark master workbook, assigned per group).
/// Each route card shows group, lead, travel km, tonnage, schedule,
/// vehicle and driver. Tap to see detail / begin stops.
class VisitsScreen extends StatefulWidget {
  const VisitsScreen({super.key});

  @override
  State<VisitsScreen> createState() => _VisitsScreenState();
}

class _VisitsScreenState extends State<VisitsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RouteMasterProvider>().load();
      context.read<SyncProvider>().flush();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<RouteMasterProvider>();
    final sync = context.watch<SyncProvider>();
    final byGroup = provider.byGroup;
    final totalRoutes = provider.routes.length;

    return RefreshIndicator(
      onRefresh: () => context.read<RouteMasterProvider>().load(),
      child: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          AppHeader(
            eyebrow: 'Assigned routes',
            title: 'My Routes',
            subtitle: provider.loading
                ? 'Loading…'
                : '$totalRoutes route(s) across ${byGroup.length} group(s)',
          ),
          if (provider.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: WarmCard(
                child: Text('Error loading routes: ${provider.error}',
                    style: const TextStyle(color: Brand.stampRed, fontSize: 13)),
              ),
            ),
          if (!provider.loading && provider.routes.isEmpty && provider.error == null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: WarmCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('No routes assigned yet.',
                        style: TextStyle(fontWeight: FontWeight.w700, color: Brand.ink)),
                    const SizedBox(height: 6),
                    const Text(
                      'Routes are assigned per group by your cluster lead. '
                      'Once assigned they appear here with your schedule.',
                      style: TextStyle(color: Brand.inkSoft, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    Eyebrow(
                        '${sync.pendingCount} pending sync · ${sync.isOnline ? 'online' : 'offline'}'),
                  ],
                ),
              ),
            ),
          if (provider.loading)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            ),
          for (final entry in byGroup.entries) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Brand.stampGreen.withAlpha(30),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Brand.stampGreen),
                    ),
                    child: Text('Group ${entry.key}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                            color: Brand.stampGreen,
                            letterSpacing: 0.5)),
                  ),
                  const SizedBox(width: 8),
                  Text('${entry.value.length} routes',
                      style: const TextStyle(
                          color: Brand.inkSoft,
                          fontSize: 12,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            for (final route in entry.value)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                child: _RouteCard(route: route),
              ),
          ],
        ],
      ),
    );
  }
}

class _RouteCard extends StatelessWidget {
  final RouteMaster route;
  const _RouteCard({required this.route});

  @override
  Widget build(BuildContext context) {
    return WarmCard(
      onTap: () => _showDetail(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(route.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 15, color: Brand.ink)),
              ),
              if (route.vehicle != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Brand.card,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Brand.ink.withAlpha(60)),
                  ),
                  child: Text(route.vehicle!,
                      style: const TextStyle(
                          fontSize: 10,
                          fontFamily: Brand.fontMono,
                          fontWeight: FontWeight.w600,
                          color: Brand.ink)),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              _Kpi('${route.travelKm.toInt()}', 'km'),
              const SizedBox(width: 10),
              _Kpi('${route.tonnageTarget.toInt()}', 't'),
              const SizedBox(width: 10),
              if (route.orderDays != null)
                Flexible(
                    child: _Kpi(
                        route.orderDays!.split(',').first.trim().substring(0, 3),
                        'order')),
              const SizedBox(width: 10),
              if (route.deliveryDays != null)
                Flexible(
                    child: _Kpi(
                        route.deliveryDays!.split(',').first.trim().substring(0, 3),
                        'deliver')),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.person_outline, size: 13, color: Brand.inkSoft),
              const SizedBox(width: 3),
              Text('Lead: ${route.leadEmail.split('@').first}',
                  style: const TextStyle(fontSize: 11, color: Brand.inkSoft)),
              const Spacer(),
              if (route.driver != null)
                Text('Driver: ${route.driver}',
                    style: const TextStyle(fontSize: 11, color: Brand.inkSoft)),
            ],
          ),
        ],
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        builder: (_, ctrl) => ListView(
          controller: ctrl,
          padding: const EdgeInsets.all(24),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Brand.ink.withAlpha(40),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(route.name,
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 22, color: Brand.ink)),
            const SizedBox(height: 12),
            _DetailRow('Group', 'Group ${route.groupName}'),
            _DetailRow('Cluster lead', route.leadEmail),
            _DetailRow('Your email', route.repEmail),
            _DetailRow('Travel', '${route.travelKm.toInt()} km'),
            _DetailRow('Tonnage target', '${route.tonnageTarget.toInt()} t'),
            if (route.orderDays != null) _DetailRow('Order days', route.orderDays),
            if (route.deliveryDays != null) _DetailRow('Delivery days', route.deliveryDays),
            if (route.vehicle != null) _DetailRow('Vehicle', route.vehicle),
            if (route.driver != null) _DetailRow('Driver', route.driver),
            if (route.sourceRep != null)
              _DetailRow('Original rep', route.sourceRep),
            if (route.sourceContact != null)
              _DetailRow('Contact', route.sourceContact),
          ],
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  final String value;
  final String label;
  const _Kpi(this.value, this.label);

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(value,
            style: const TextStyle(
                fontFamily: Brand.fontMono,
                fontWeight: FontWeight.w800,
                fontSize: 14,
                color: Brand.ink,
                fontFeatures: [FontFeature.tabularFigures()])),
        const SizedBox(width: 2),
        Text(label,
            style: const TextStyle(fontSize: 11, color: Brand.inkSoft)),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String? value;
  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Brand.inkSoft)),
          ),
          Expanded(
            child: Text(value ?? '',
                style: const TextStyle(fontSize: 13, color: Brand.ink)),
          ),
        ],
      ),
    );
  }
}
