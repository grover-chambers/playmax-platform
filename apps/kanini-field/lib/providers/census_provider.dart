import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../models/outlet_model.dart';
import '../services/census_service.dart';
import 'shift_provider.dart';

/// Holds the live [CensusDraft] for the census flow and the list of outlets
/// already captured on this device (offline-first, persisted in Hive).
class CensusProvider extends ChangeNotifier {
  CensusProvider({ShiftProvider? shift}) : _shift = shift;

  final ShiftProvider? _shift;

  static const _boxName = 'census_outlets';

  late Box<Map<String, dynamic>> _box;
  final List<OutletModel> _captured = [];
  CensusDraft _draft = CensusDraft();
  bool _ready = false;

  bool get isReady => _ready;
  List<OutletModel> get capturedOutlets => List.unmodifiable(_captured);
  CensusDraft get draft => _draft;

  Future<void> init() async {
    if (_ready) return;
    _box = await Hive.openBox<Map<String, dynamic>>(_boxName);
    for (final v in _box.values) {
      _captured.add(OutletModel.fromJson(Map<String, dynamic>.from(v)));
    }
    _ready = true;
    notifyListeners();
  }

  int get todayCount {
    final key = DateTime.now();
    return _captured
        .where((o) =>
            o.createdAt.year == key.year &&
            o.createdAt.month == key.month &&
            o.createdAt.day == key.day)
        .length;
  }

  /// Reset the draft for a fresh capture.
  void resetDraft() {
    _draft = CensusDraft();
    notifyListeners();
  }

  /// Run the quality gates and persist the accepted census locally + queue it
  /// for sync. Returns the created outlet, or throws [CensusRejectedException].
  Future<OutletModel> submit(String repId) async {
    final result = await censusService.submitCensus(draft: _draft, repId: repId);
    _captured.add(result.outlet);
    await _box.put(result.outlet.id, result.outlet.toJson());
    _draft = CensusDraft();
    _shift?.touch();
    notifyListeners();
    return result.outlet;
  }
}
