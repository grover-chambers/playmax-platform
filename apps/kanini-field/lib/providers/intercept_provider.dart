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

  // IMPORTANT: box must be OPENED UNTYPED. Hive does not enforce the
  // `Box<Map<String, dynamic>>` generic at runtime: values stored to disk are
  // materialized back as `_Map<dynamic, dynamic>`, and a TYPED box's `.values`
  // iterator downcasts each element inside `moveNext` (keystore.dart:124) —
  // throwing `'_Map<dynamic, dynamic>' is not a subtype of 'Map<String, dynamic>'`
  // OUTSIDE any try/catch we could place around a `Map<String, dynamic>.from`.
  // Opening untyped returns raw dynamic values we convert safely per-record.
  late Box _box;
  final List<ConsumerInterceptModel> _captured = [];
  bool _ready = false;

  bool get isReady => _ready;
  List<ConsumerInterceptModel> get capturedIntercepts =>
      List.unmodifiable(_captured);

  Future<void> init() async {
    if (_ready) return;
    _box = await Hive.openBox(_boxName);
    // Iterate KEYS and fetch per-key so the map value never passes through a
    // typed iterator's hidden cast; conversion + model parse are wrapped in
    // the try below.
    for (final key in _box.keys) {
      final v = _box.get(key);
      if (v == null) continue;
      try {
        // Hive exposes Map<dynamic, dynamic> at runtime; normalize keys to
        // String before the model's fromJson (which casts to String keys).
        final map = _normalizeMap(v);
        _captured.add(ConsumerInterceptModel.fromJson(map));
      } catch (e) {
        // Quarantine only the invalid record — log, skip, never delete. The
        // app must not crash because one legacy/offline record is malformed,
        // and unsynced field data must NOT be wiped.
        // ignore: avoid_print
        print('InterceptProvider: skipping corrupted record key=$key error=$e');
      }
    }
    _ready = true;
    notifyListeners();
  }

  /// Recursively normalize a Hive `Map<dynamic, dynamic>` (and any nested maps
  /// / lists) into `Map<String, dynamic>`, converting every key to String.
  /// Keys that cannot be represented as a String are dropped to avoid a cast.
  static Map<String, dynamic> _normalizeMap(dynamic value) {
    if (value is! Map) return {};
    final out = <String, dynamic>{};
    for (final entry in value.entries) {
      final key = entry.key;
      if (key is String) {
        out[key] = _normalizeValue(entry.value);
      }
    }
    return out;
  }

  /// Recursively normalize nested maps/lists so deep `_Map<dynamic,dynamic>`
  /// values inside a record also convert without a cast.
  static dynamic _normalizeValue(dynamic value) {
    if (value is Map) {
      final out = <String, dynamic>{};
      for (final e in value.entries) {
        if (e.key is String) out[e.key as String] = _normalizeValue(e.value);
      }
      return out;
    }
    if (value is List) {
      return value.map(_normalizeValue).toList();
    }
    return value;
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
