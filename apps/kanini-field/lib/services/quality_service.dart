import 'dart:math' as math;

import 'package:hive_flutter/hive_flutter.dart';

import '../config/field_config.dart';
import '../domain/typology.dart';
import '../models/outlet_model.dart';
import 'straightlining.dart';

/// QUALITY SERVICE — §5 enforcement layer.
///
/// Every submission passes through these gates before it is accepted into the
/// sync queue. Three of the five are hard rejections; the other two flag the
/// row so the supervisor's evening review catches it. Gates are enforced in
/// code so "quality by training" is never the only defence.
class QualityService {
  QualityService._();

  static final QualityService instance = QualityService._();

  /// §5 GPS gate: fix accuracy worse than [FieldConfig.gpsAcceptM] is a hard
  /// rejection. Threshold lives in FieldConfig, not here.
  static double get gpsGateAccuracyM => FieldConfig.gpsAcceptM;

  /// §5 Proximity: check-in further than [FieldConfig.proximityRadiusM] from
  /// the outlet's stored GPS suggests the enumerator was not at the outlet.
  static double get proximityRadiusM => FieldConfig.proximityRadiusM;

  /// §5 Speed flag threshold — configurable, see FieldConfig.
  static Duration get minVisitDuration => FieldConfig.minVisitDuration;

  /// §5 Back-check sampling fraction — configurable, see FieldConfig.
  static double get backCheckFraction => FieldConfig.backCheckFraction;

  late Box<String> _censusLog; // key: '<outletId>:<yyyy-MM-dd>', value: repId

  Future<void> init() async {
    _censusLog = await Hive.openBox<String>('census_log');
  }

  String dateKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  /// GPS gate (§5). Returns [QualityFlag.gpsGate] when the fix is worse than
  /// [gpsGateAccuracyM]. When rejected, the capture must not be written at all.
  QualityFlag? gateGps(double? accuracyM) {
    if (accuracyM == null) return QualityFlag.gpsGate;
    if (accuracyM > gpsGateAccuracyM) return QualityFlag.gpsGate;
    return null;
  }

  /// Proximity (§5). Uses the outlet's stored GPS as the expected location.
  QualityFlag? proximityCheck(OutletModel outlet, double lat, double lng) {
    final d = distanceMeters(outlet.gpsLat, outlet.gpsLng, lat, lng);
    if (d > proximityRadiusM) return QualityFlag.proximity;
    return null;
  }

  /// One-visit rule (§5): census already captured for this outlet today.
  QualityFlag? oneVisitRule(String outletId, DateTime now) {
    final key = '$outletId:${dateKey(now)}';
    if (_censusLog.containsKey(key)) return QualityFlag.oneVisitRule;
    return null;
  }

  /// Record that a census was completed for [outletId] today so repeat
  /// capture is rejected by [oneVisitRule].
  Future<void> recordCensusVisit(String outletId, String repId) async {
    await _censusLog.put('$outletId:${dateKey(DateTime.now())}', repId);
  }

  /// Storefront photo is mandatory for a completed census (§4.1, §5).
  QualityFlag? photoMandatory(bool hasStorefrontPhoto) {
    return hasStorefrontPhoto ? null : QualityFlag.photoMandatory;
  }

  /// Speed flag (§5): visit shorter than [minVisitDuration].
  QualityFlag? speedFlag(Duration visitDuration) {
    return visitDuration < minVisitDuration ? QualityFlag.speedFlag : null;
  }

  /// Straightlining (§5): delegate to [StraightliningDetector] and map the
  /// worst hit back to a flag. Returns null when the records are clean.
  QualityFlag? straightlining(List<Map<String, dynamic>> records,
      {int threshold = 5}) {
    final hits = StraightliningDetector.detect(records, threshold: threshold);
    return hits.isEmpty ? null : QualityFlag.straightlining;
  }

  /// §5 Back-check sampling: with [backCheckFraction] (10%), this enumerator's
  /// latest submission should be re-visited by a supervisor. Deterministic on
  /// (repId, date) so the same outlet is not re-checked twice in a day.
  bool dueForBackCheck(String repId, DateTime date) {
    final seed = (repId.hashCode ^ dateKey(date).hashCode).abs();
    return (seed % 100) < (backCheckFraction * 100).round();
  }

  /// Haversine distance in metres (matches the check-in screen).
  static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
    const R = 6371000.0;
    final dLat = _radians(lat2 - lat1);
    final dLng = _radians(lng2 - lng1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_radians(lat1)) *
            math.cos(_radians(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return 2 * R * math.asin(math.sqrt(a));
  }

  static double _radians(double deg) => deg * math.pi / 180.0;
}

final QualityService qualityService = QualityService.instance;
