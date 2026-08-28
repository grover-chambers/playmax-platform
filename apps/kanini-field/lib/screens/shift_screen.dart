import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/shift_provider.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';

/// Shift clocking — the rep checks in at the start of a shift and out at the
/// end. Time on shift is included in the day's submission.
///
/// [gate] mode is shown as the first objective after login at the start of each
/// day (and again after midnight). In gate mode there is no back button and no
/// other rep operation is reachable until the rep clocks in; once clocked in
/// [RootScreen] routes to the dashboard.
class ShiftScreen extends StatelessWidget {
  final bool gate;
  const ShiftScreen({super.key, this.gate = false});

  String _fmt(DateTime d) {
    final h = d.hour.toString().padLeft(2, '0');
    final m = d.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final shift = context.watch<ShiftProvider>();
    final clockedIn = shift.clockedIn;
    final clockedOut = shift.clockedOut;
    final timedOut = shift.timeoutReason != null;

    final duration = shift.timeOnShift;

    final body = ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (timedOut) ...[
          WarmCard(
            child: Row(
              children: [
                const Icon(Icons.timer_off_outlined, color: Brand.amberDeep),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Shift timed out automatically — ${shift.timeoutReason}.',
                    style: const TextStyle(color: Brand.ink, fontSize: 12.5, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        Container(
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
                  Eyebrow(gate ? "Today's shift" : 'Shift status', color: Brand.amber),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: clockedIn
                          ? Brand.stampGreen
                          : clockedOut
                              ? Brand.pendingGrey
                              : Brand.stampRed,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      clockedIn ? 'ON SHIFT' : clockedOut ? 'CLOCKED OUT' : 'NOT STARTED',
                      style: const TextStyle(
                        color: Colors.white,
                        fontFamily: Brand.fontMono,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.05,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                '${duration.inHours}h ${(duration.inMinutes % 60).toString().padLeft(2, '0')}m',
                style: const TextStyle(
                  color: Colors.white,
                  fontFamily: Brand.fontMono,
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              const Text('time on shift', style: TextStyle(color: Brand.paper, fontSize: 11.5)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (shift.inAt != null)
          WarmCard(
            child: Column(
              children: [
                _TimeRow(label: 'Clocked in', value: _fmt(shift.inAt!)),
                if (shift.outAt != null) ...[
                  const InkDivider(),
                  _TimeRow(label: 'Clocked out', value: _fmt(shift.outAt!)),
                ],
              ],
            ),
          ),
        const SizedBox(height: 20),
        if (!clockedOut)
          AmberButton(
            clockedIn ? 'Clock out' : gate ? "Clock in — start today's shift" : 'Clock in — start shift',
            onPressed: clockedIn
                ? () async {
                    UiFx.stamp();
                    await context.read<ShiftProvider>().clockOut();
                  }
                : () async {
                    UiFx.confirm();
                    await context.read<ShiftProvider>().clockIn();
                    if (!context.mounted) return;
                    await stampIn(context, text: 'ON SHIFT');
                  },
          )
        else
          AmberButton(
            'Clock in for a new shift',
            outlined: true,
            onPressed: () async {
              UiFx.confirm();
              await context.read<ShiftProvider>().clockIn();
              if (!context.mounted) return;
              await stampIn(context, text: 'ON SHIFT');
            },
          ),
        const SizedBox(height: 16),
        Text(
          gate
              ? 'Clock in when you reach the field. Until you do, capture and submission are locked — this is the first task of your day.'
              : 'Clock in when you start fieldwork and clock out when you finish. Time on shift is included in your daily submission.',
          style: const TextStyle(color: Brand.inkSoft, fontSize: 12.5, height: 1.5),
        ),
      ],
    );

    if (gate) {
      return Scaffold(
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 24, 20, 4),
                child: Row(
                  children: [
                    Eyebrow('Field rep'),
                    Spacer(),
                    StampTag(StampStatus.pending, label: 'Shift gate'),
                  ],
                ),              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'Start today',
                  style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Brand.ink),
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 6, 20, 0),
                child: Text(
                  'Clock in before you can capture, intercept, submit or run visits.',
                  style: TextStyle(color: Brand.inkSoft, fontSize: 13, height: 1.5),
                ),
              ),
              Expanded(child: body),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Shift check-in')),
      body: body,
    );
  }
}

class _TimeRow extends StatelessWidget {
  final String label;
  final String value;
  const _TimeRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Brand.inkSoft)),
          Text(value, style: const TextStyle(
          fontFamily: Brand.fontMono,
          fontWeight: FontWeight.w800,
          color: Brand.ink,
          fontFeatures: [FontFeature.tabularFigures()],
        )),
        ],
      ),
    );
  }
}