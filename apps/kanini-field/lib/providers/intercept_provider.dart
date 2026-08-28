import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../models/consumer_intercept_model.dart';
import '../services/intercept_service.dart';
import '../services/sequence_lock.dart';
import 'shift_provider.dart';

/// Tracks captured consumer intercepts on this device and submits new ones
/// through [InterceptService] with the sequence lock enforced.
class InterceptProvider extends ChangeNotifier {
  InterceptProvider({ShiftProvider? shift}) : _shift = shift;

  final ShiftProvider? _shift;

  static const _boxName = 'intercepts_local';

  late Box<Map<String, dynamic>> _box;
  final List<ConsumerInterceptModel> _captured = [];
  bool _ready = false;

  bool get isReady => _ready;
  List<ConsumerInterceptModel> get capturedIntercepts =>
      List.unmodifiable(_captured);

  Future<void> init() async {
    if (_ready) return;
    _box = await Hive.openBox<Map<String, dynamic>>(_boxName);
    for (final v in _box.values) {
      _captured.add(ConsumerInterceptModel.fromJson(Map<String, dynamic>.from(v)));
    }
    _ready = true;
    notifyListeners();
  }

  int get todayCount {
    final key = DateTime.now();
    return _captured
        .where((i) =>
            i.capturedAt.year == key.year &&
            i.capturedAt.month == key.month &&
            i.capturedAt.day == key.day)
        .length;
  }

  Future<ConsumerInterceptModel> submit({
    required InterceptDraft draft,
    required SurveySequenceLock lock,
    required String repId,
  }) async {
    final intercept =
        await interceptService.submitIntercept(draft: draft, lock: lock, repId: repId);
    _captured.add(intercept);
    await _box.put(intercept.id, intercept.toJson());
    _shift?.touch();
    notifyListeners();
    return intercept;
  }
}
