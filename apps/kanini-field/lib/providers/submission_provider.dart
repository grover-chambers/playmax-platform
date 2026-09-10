import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../domain/typology.dart';
import '../models/daily_submission_model.dart';
import '../services/quality_service.dart';
import '../services/straightlining.dart';
import '../services/sync_service.dart';
import 'shift_provider.dart';

/// Daily close (§5): groups the day's work into one [DailySubmissionModel] a
/// supervisor can approve or send back, raises [QualityFlag]s (straightlining
/// from the day's records, speed flags, photo gaps) and records back-checks.
class SubmissionProvider extends ChangeNotifier {
  SubmissionProvider({ShiftProvider? shift}) : _shift = shift;

  final ShiftProvider? _shift;

  static const _boxName = 'submissions_local';

  // UNTYPED box — Hive's `Box<Map<String, dynamic>>` generic isn't enforced at
  // runtime (values read back as Map<dynamic,dynamic>); the typed `.values`
  // iterator downcasts inside moveNext → throws outside any try/catch. Read
  // per-key and normalize each record safely.
  late Box _box;
  final List<DailySubmissionModel> _submissions = [];
  final List<BackCheckModel> _backChecks = [];
  bool _ready = false;

  static const _uuid = Uuid();

  bool get isReady => _ready;
  List<DailySubmissionModel> get submissions => List.unmodifiable(_submissions);
  List<BackCheckModel> get backChecks => List.unmodifiable(_backChecks);

  Future<void> init() async {
    if (_ready) return;
    _box = await Hive.openBox(_boxName);
    for (final key in _box.keys) {
      final v = _box.get(key);
      if (v == null) continue;
      try {
        final map = _normalizeMap(v);
        if (map['type'] == 'back_check') {
          _backChecks.add(BackCheckModel.fromJson(map));
        } else {
          _submissions.add(DailySubmissionModel.fromJson(map));
        }
      } catch (e) {
        // Quarantine only the invalid record — log, skip, never delete.
        // ignore: avoid_print
        print('SubmissionProvider: skipping corrupted record key=$key error=$e');
      }
    }
    _ready = true;
    notifyListeners();
  }

  /// Recursively normalize a Hive `Map<dynamic, dynamic>` into
  /// `Map<String, dynamic>` (keys converted to String; non-String keys dropped).
  static Map<String, dynamic> _normalizeMap(dynamic value) {
    if (value is! Map) return {};
    final out = <String, dynamic>{};
    for (final e in value.entries) {
      if (e.key is String) out[e.key as String] = _normalizeValue(e.value);
    }
    return out;
  }

  static dynamic _normalizeValue(dynamic value) {
    if (value is Map) {
      final out = <String, dynamic>{};
      for (final e in value.entries) {
        if (e.key is String) out[e.key as String] = _normalizeValue(e.value);
      }
      return out;
    }
    if (value is List) return value.map(_normalizeValue).toList();
    return value;
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
    await syncService.enqueueSync('daily_submissions', submission.id, submission.toJson());
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
    await syncService.enqueueSync('back_checks', check.id, check.toJson());
    notifyListeners();
  }
}
