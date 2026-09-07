import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/census_batch_model.dart';
import '../models/daily_submission_model.dart';
import '../providers/batch_provider.dart';
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
  bool _busy = false;

  Future<void> _submitBatch() async {
    setState(() => _busy = true);
    final batches = context.read<BatchProvider>();
    try {
      await batches.submitActiveBatch();
      UiFx.stamp();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Batch submitted successfully')),
      );
    } catch (e) {
      UiFx.reject();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submit failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final intercepts = context.watch<InterceptProvider>();
    final submissions = context.watch<SubmissionProvider>();
    final batchProvider = context.watch<BatchProvider>();

    final activeBatch = batchProvider.activeBatch;
    final hasActiveWork = (activeBatch?.recordCount ?? 0) > 0;

    return ListView(
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        const AppHeader(eyebrow: 'Field Batches · §5', title: 'Submissions'),
        // Active Batch summary
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: WarmCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (activeBatch != null) ...[
                  Text(
                    'Active Batch: ${activeBatch.batchNumber}',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.inkSoft, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      KpiTile('${activeBatch.recordCount}', 'Outlets'),
                      const SizedBox(width: 10),
                      KpiTile('${intercepts.todayCount}', 'Intercepts'),
                    ],
                  ),
                ] else
                  const Text(
                    'No active batch. Start a new census to begin.',
                    style: TextStyle(color: Brand.inkSoft, fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                const SizedBox(height: 16),
                AmberButton(
                  _busy ? 'Submitting…' : 'Submit Batch',
                  onPressed: hasActiveWork && !_busy ? _submitBatch : null,
                  loading: _busy,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Submitting a batch makes records available to the mapping engine.',
                  style: TextStyle(color: Brand.inkSoft, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
        SectionTitle('Recent Batches', trailing: '${batchProvider.batches.length}'),
        if (batchProvider.batches.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text('No batches yet.', style: TextStyle(color: Brand.inkSoft, fontSize: 13)),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(children: [for (final b in batchProvider.batches) _BatchTile(batch: b)]),
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

class _BatchTile extends StatelessWidget {
  final CensusBatchModel batch;
  const _BatchTile({required this.batch});

  @override
  Widget build(BuildContext context) {
    final d = DateFormat('dd MMM, HH:mm');
    final status = batch.status.name.toLowerCase();

    StampStatus st;
    switch (batch.status) {
      case BatchStatus.synced:
        st = StampStatus.visited;
        break;
      case BatchStatus.submitted:
      case BatchStatus.syncing:
        st = StampStatus.visited;
        break;
      case BatchStatus.failed:
      case BatchStatus.partial:
        st = StampStatus.skipped;
        break;
      default:
        st = StampStatus.skipped;
    }

    return WarmCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  batch.batchNumber,
                  style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.ink, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  '${d.format(batch.startedAt)} · ${batch.recordCount} outlets',
                  style: const TextStyle(color: Brand.inkSoft, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StampTag(st, label: status.toUpperCase()),
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