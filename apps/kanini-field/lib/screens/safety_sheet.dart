import 'package:flutter/material.dart';

import '../config/field_config.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import 'package:url_launcher/url_launcher.dart' as launcher;

/// SAFETY — persistent capability, not a Field Guide subsection. Bottom sheet
/// per mockup; fully offline (contacts come from bundled FieldConfig until
/// NAMPARK serves them). Numbers are never invented: unprovisioned contacts
/// render "number pending" instead of a call button.
class SafetySheet extends StatelessWidget {
  const SafetySheet({super.key});

  static Future<void> show(BuildContext context) => showModalBottomSheet(
        context: context,
        backgroundColor: Brand.paper,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        builder: (_) => const SafetySheet(),
      );

  @override
  Widget build(BuildContext context) {
    final rows = [
      _Row(
        title: 'Hostility or safety concern',
        chain: [FieldConfig.safetyClusterLead, FieldConfig.safetyOpsLead],
        mode: _Mode.callNow,
      ),
      _Row(
        title: 'Police or askari stop you',
        chain: [FieldConfig.safetyOpsLead],
        mode: _Mode.callNow,
      ),
      _Row(
        title: 'Device or sync failure',
        chain: [FieldConfig.safetyDeviceSupport1, FieldConfig.safetyDeviceSupport2],
        mode: _Mode.sameDay,
      ),
    ];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                    color: Brand.lineStrong,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 14),
            const Text('Safety',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            for (final r in rows)
              _Tile(
                row: r,
              ),
            if (!FieldConfig.safetyContactsReady) ...[
              const SizedBox(height: 8),
              const Text(
                'Phone numbers are being provisioned. Until then, escalate in '
                'person to your cluster lead.',
                style: TextStyle(fontSize: 11.5, color: Brand.pendingGrey),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum _Mode { callNow, sameDay }

class _Row {
  final String title;
  final List<SafetyContact> chain;
  final _Mode mode;

  const _Row({
    required this.title,
    required this.chain,
    required this.mode,
  });
}

class _Tile extends StatelessWidget {
  final _Row row;

  const _Tile({required this.row});

  String get _chainLabel =>
      row.chain.map((c) => c.name).join(', then ');

  @override
  Widget build(BuildContext context) {
    final firstCallable =
        row.chain.where((c) => c.phone != null).toList();
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Brand.card,
        border: Border.all(color: Brand.line),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.title,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  row.mode == _Mode.callNow
                      ? '$_chainLabel · call now'
                      : '$_chainLabel · same day',
                  style:
                      const TextStyle(fontSize: 12, color: Brand.inkSoft),
                ),
              ],
            ),
          ),
          if (firstCallable.isNotEmpty)
            IconButton(
              tooltip: 'Call ${firstCallable.first.name}',
              icon: const Icon(Icons.call, color: Brand.stampRed),
              onPressed: () {
                UiFx.confirm();
                launcher.launchUrl(
                    Uri.parse('tel:${firstCallable.first.phone}'));
              },
            )
          else
            const Icon(Icons.phone_disabled, color: Brand.pendingGrey),
        ],
      ),
    );
  }
}
