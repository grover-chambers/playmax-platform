import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/daily_submission_model.dart';
import '../providers/auth_provider.dart';
import '../providers/census_provider.dart';
import '../providers/intercept_provider.dart';
import '../providers/submission_provider.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';

/// Submissions — daily close (§5). Groups the day's work into one batch the
/// supervisor approves or flags, raising quality flags (straightlining, speed,
/// photo gaps) and recording back-checks.
class SubmissionsScreen extends StatefulWidget {
  const SubmissionsScreen({super.key});

  @override
  State<SubmissionsScreen> createState() => _SubmissionsScreenState();
}

class _SubmissionsScreenState extends State<SubmissionsScreen> {
  bool _closing = false;

  Future<void> _closeDay() async {
    setState(() => _closing = true);
    final census = context.read<CensusProvider>();
    final intercepts = context.read<InterceptProvider>();
    final submissions = context.read<SubmissionProvider>();
    // Fail closed: this screen is only reachable when authenticated. A null
    // session here means the app state is broken — never fall back to a
    // fake rep id.
    final repId = context.read<AuthProvider>().currentUser?.id;
    if (repId == null) {
      UiFx.reject();
      setState(() => _closing = false);
      throw StateError('Not authenticated — sign in before closing the day.');
    }

    final rows = census.capturedOutlets.map((o) => o.toJson()).toList();

    try {
      final sub = await submissions.closeDay(
        repId: repId,
        outletCount: census.todayCount,
        interceptCount: intercepts.todayCount,
        outletRows: rows,
      );
      UiFx.stamp();
      if (!mounted) return;
      final flagMsg = sub.qualityFlags.isEmpty
          ? 'Day closed — no flags raised'
          : 'Day closed — ${sub.qualityFlags.length} flag(s) for review';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(flagMsg)));
    } catch (e) {
      UiFx.reject();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Close failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _closing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final census = context.watch<CensusProvider>();
    final intercepts = context.watch<InterceptProvider>();
    final submissions = context.watch<SubmissionProvider>();
    final hasWork = census.todayCount > 0 || intercepts.todayCount > 0;

    return ListView(
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        const AppHeader(eyebrow: 'Daily close · §5', title: 'Submissions'),
        // Today's batch summary
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: WarmCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    KpiTile('${census.todayCount}', 'Outlets'),
                    const SizedBox(width: 10),
                    KpiTile('${intercepts.todayCount}', 'Intercepts'),
                    const SizedBox(width: 10),
                    KpiTile('${submissions.backChecks.length}', 'Back-checks'),
                  ],
                ),
                const SizedBox(height: 16),
                AmberButton(
                  _closing ? 'Closing…' : 'Close day & submit',
                  onPressed: hasWork && !_closing ? _closeDay : null,
                  loading: _closing,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Supervisor reviews your batch the same evening.',
                  style: TextStyle(color: Brand.inkSoft, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
        SectionTitle('Submissions', trailing: '${submissions.submissions.length}'),
        if (submissions.submissions.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text('No submissions yet.', style: TextStyle(color: Brand.inkSoft, fontSize: 13)),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(children: [for (final s in submissions.submissions) _SubmissionTile(submission: s)]),
          ),
        SectionTitle('Back-checks', trailing: '${submissions.backChecks.length}'),
        if (submissions.backChecks.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text('No back-checks recorded.', style: TextStyle(color: Brand.inkSoft, fontSize: 13)),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(children: [for (final b in submissions.backChecks) _BackCheckRow(b)]),
          ),
      ],
    );
  }
}

class _SubmissionTile extends StatelessWidget {
  final DailySubmissionModel submission;
  const _SubmissionTile({required this.submission});

  @override
  Widget build(BuildContext context) {
    final d = DateFormat('dd MMM yyyy');
    final status = submission.status.toLowerCase();
    final st = status.contains('draft') || status.contains('reject')
        ? StampStatus.skipped
        : StampStatus.visited;
    return WarmCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${d.format(DateTime.parse(submission.submissionDate))} · '
                  '${submission.outletCount} outlets · ${submission.interceptCount} intercepts',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  submission.qualityFlags.isEmpty
                      ? 'No flags'
                      : submission.qualityFlags.map((f) => '• $f').join('\n'),
                  style: TextStyle(
                    color: submission.qualityFlags.isEmpty ? Brand.stampGreen : Brand.amberDeep,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StampTag(st, label: submission.status),
        ],
      ),
    );
  }
}

class _BackCheckRow extends StatelessWidget {
  final BackCheckModel b;
  const _BackCheckRow(this.b);

  @override
  Widget build(BuildContext context) {
    final passed = b.status == 'passed';
    return WarmCard(
      child: Row(
        children: [
          Icon(passed ? Icons.verified : Icons.warning_amber, color: passed ? Brand.stampGreen : Brand.amberDeep),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Back-check · ${b.status}', style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink)),
                Text(b.discrepancy ?? 'No discrepancy noted', style: const TextStyle(color: Brand.inkSoft, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}