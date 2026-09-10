import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../models/outlet_model.dart';
import '../services/census_service.dart';
import '../services/sync_service.dart';
import 'batch_provider.dart';
import 'shift_provider.dart';

/// Holds the live [CensusDraft] for the census flow and the list of outlets
/// already captured on this device (offline-first, persisted in Hive).
class CensusProvider extends ChangeNotifier {
  CensusProvider({ShiftProvider? shift, BatchProvider? batch})
      : _shift = shift,
        _batch = batch;

  final ShiftProvider? _shift;
  final BatchProvider? _batch;

  static const _boxName = 'census_outlets';

  // Must stay UNTYPED — see InterceptProvider for the full explanation. A typed
  // `Box<Map<String, dynamic>>` downcasts each stored value inside the typed
  // `.values` iterator's moveNext, throwing outside any try/catch and crashing
  // startup on legacy Hive data.
  late Box _box;
  final List<OutletModel> _captured = [];
  CensusDraft _draft = CensusDraft();
  bool _ready = false;

  bool get isReady => _ready;
  List<OutletModel> get capturedOutlets => List.unmodifiable(_captured);
  CensusDraft get draft => _draft;

  Future<void> init() async {
    if (_ready) return;
    _box = await Hive.openBox(_boxName);
    for (final key in _box.keys) {
      final v = _box.get(key);
      if (v == null) continue;
      try {
        // Hive exposes Map<dynamic, dynamic> at runtime; normalize keys to
        // String before fromJson.
        final map = _normalizeMap(v);
        _captured.add(OutletModel.fromJson(map));
      } catch (e) {
        // Quarantine only the invalid record — log, skip, never delete.
        // ignore: avoid_print
        print('CensusProvider: skipping corrupted record key=$key error=$e');
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

  /// Edit an existing captured outlet before submission. Only allowed while
  /// the outlet is still on-device (not yet synced).
  Future<void> editOutlet(String outletId, OutletModel updated) async {
    final idx = _captured.indexWhere((o) => o.id == outletId);
    if (idx == -1) return;
    _captured[idx] = updated;
    await _box.put(outletId, updated.toJson());
    // Update in sync queue too so the server gets the edited version
    await syncService.enqueueSync('outlets', outletId, updated.toJson());
    notifyListeners();
  }

  /// Delete a captured outlet before submission. Removes from Hive and the
  /// sync queue so it never reaches the server.
  Future<void> deleteOutlet(String outletId) async {
    _captured.removeWhere((o) => o.id == outletId);
    await _box.delete(outletId);
    // Remove from sync queue if still pending
    await syncService.pendingSyncBox.delete('outlets:$outletId');
    notifyListeners();
  }

  /// Run the quality gates and persist the accepted census locally + queue it
  /// for sync. Returns the created outlet, or throws [CensusRejectedException].
  Future<OutletModel> submit(String repId, String repName) async {
    final batch = await _batch?.startNewBatch(repId: repId, repName: repName);
    final result = await censusService.submitCensus(
      draft: _draft,
      repId: repId,
      batchId: batch?.id ?? 'no-batch',
    );
    _captured.add(result.outlet);
    await _box.put(result.outlet.id, result.outlet.toJson());
    await _batch?.incrementRecordCount();
    _draft = CensusDraft();
    _shift?.touch();
    notifyListeners();
    return result.outlet;
  }
}
