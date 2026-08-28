import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../domain/typology.dart';
import '../models/daily_submission_model.dart';
import '../services/quality_service.dart';
import '../services/straightlining.dart';
import 'shift_provider.dart';

/// Daily close (§5): groups the day's work into one [DailySubmissionModel] a
/// supervisor can approve or send back, raises [QualityFlag]s (straightlining
/// from the day's records, speed flags, photo gaps) and records back-checks.
class SubmissionProvider extends ChangeNotifier {
  SubmissionProvider({ShiftProvider? shift}) : _shift = shift;

  final ShiftProvider? _shift;

  static const _boxName = 'submissions_local';

  late Box<Map<String, dynamic>> _box;
  final List<DailySubmissionModel> _submissions = [];
  final List<BackCheckModel> _backChecks = [];
  bool _ready = false;

  static const _uuid = Uuid();

  bool get isReady => _ready;
  List<DailySubmissionModel> get submissions => List.unmodifiable(_submissions);
  List<BackCheckModel> get backChecks => List.unmodifiable(_backChecks);

  Future<void> init() async {
    if (_ready) return;
    _box = await Hive.openBox<Map<String, dynamic>>(_boxName);
    for (final v in _box.values) {
      final json = Map<String, dynamic>.from(v);
      if (json['type'] == 'back_check') {
        _backChecks.add(BackCheckModel.fromJson(json));
      } else {
        _submissions.add(DailySubmissionModel.fromJson(json));
      }
    }
    _ready = true;
    notifyListeners();
  }

  DailySubmissionModel? submissionFor(String date) {
    for (final s in _submissions) {
      if (s.submissionDate == date) return s;
    }
    return null;
  }

  /// §5 Close the day. Runs straightlining across the day's outlet rows and
  /// decides whether a back-check is due for this enumerator today.
  Future<DailySubmissionModel> closeDay({
    required String repId,
    required int outletCount,
    required int interceptCount,
    required List<Map<String, dynamic>> outletRows,
  }) async {
    final date = qualityService.dateKey(DateTime.now());
    final flags = <String>[];

    final straightline = StraightliningDetector.detect(outletRows);
    if (straightline.isNotEmpty) {
      flags.add(QualityFlag.straightlining.code);
    }
    for (final s in straightline.take(3)) {
      flags.add('straightlining:${s.field}');
    }

    if (qualityService.dueForBackCheck(repId, DateTime.now())) {
      flags.add('back_check_due');
    }

    final now = DateTime.now().toUtc();
    final submission = DailySubmissionModel(
      id: _uuid.v4(),
      enumeratorId: repId,
      submissionDate: date,
      outletCount: outletCount,
      interceptCount: interceptCount,
      qualityFlags: flags,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    );

    await _box.put(submission.id, submission.toJson());
    _submissions.insert(0, submission);
    _shift?.touch();
    notifyListeners();
    return submission;
  }

  /// §5 Supervisor re-visits [outletId] and records the result blind.
  Future<void> recordBackCheck({
    required String outletId,
    required String enumeratorId,
    required String supervisorId,
    required double gpsLat,
    required double gpsLng,
    required bool businessMatches,
    required bool openForBusiness,
    String? discrepancy,
  }) async {
    final now = DateTime.now().toUtc();
    final check = BackCheckModel(
      id: _uuid.v4(),
      outletId: outletId,
      enumeratorId: enumeratorId,
      supervisorId: supervisorId,
      reVisitedAt: now,
      gpsLat: gpsLat,
      gpsLng: gpsLng,
      businessMatches: businessMatches,
      openForBusiness: openForBusiness,
      discrepancy: discrepancy,
      status: businessMatches && openForBusiness ? 'passed' : 'failed',
      createdAt: now,
      updatedAt: now,
    );
    await _box.put(check.id, {...check.toJson(), 'type': 'back_check'});
    _backChecks.insert(0, check);
    notifyListeners();
  }
}
