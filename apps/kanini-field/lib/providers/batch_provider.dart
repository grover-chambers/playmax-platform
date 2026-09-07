import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/census_batch_model.dart';
import '../services/sync_service.dart';
import '../services/device_id.dart';

class BatchProvider extends ChangeNotifier {
  static const _boxName = 'census_batches_local';
  late Box<Map<String, dynamic>> _box;
  final List<CensusBatchModel> _batches = [];
  CensusBatchModel? _activeBatch;
  bool _ready = false;

  bool get isReady => _ready;
  List<CensusBatchModel> get batches => List.unmodifiable(_batches);
  CensusBatchModel? get activeBatch => _activeBatch;

  Future<void> init() async {
    if (_ready) return;
    _box = await Hive.openBox<Map<String, dynamic>>(_boxName);
    for (final v in _box.values) {
      final batch = CensusBatchModel.fromJson(Map<String, dynamic>.from(v));
      _batches.add(batch);
      if (batch.status == BatchStatus.draft) {
        _activeBatch = batch;
      }
    }
    // Sort batches by creation date, newest first
    _batches.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    _ready = true;
    updateBatchStatuses();

    // Watch for sync completions to update status in real-time
    syncService.pendingSyncBox.watch().listen((_) => updateBatchStatuses());

    notifyListeners();
  }

  /// Compares the local batch list against the sync queue. If a batch was
  /// submitted and is no longer in the sync queue, it means it has been
  /// successfully applied to the server.
  void updateBatchStatuses() {
    final pending = syncService.pendingItems
        .where((i) => i['entity'] == 'census_batches')
        .map((i) => i['row_id'] as String)
        .toSet();

    bool changed = false;
    for (int i = 0; i < _batches.length; i++) {
      final b = _batches[i];
      // If it was submitted/syncing but is no longer in the pending queue, mark as synced.
      if ((b.status == BatchStatus.submitted || b.status == BatchStatus.syncing) &&
          !pending.contains(b.id)) {
        _batches[i] = b.copyWith(
          status: BatchStatus.synced,
          syncedAt: DateTime.now().toUtc(),
        );
        _box.put(b.id, _batches[i].toJson());
        changed = true;
      }
    }
    if (changed) notifyListeners();
  }

  Future<CensusBatchModel> startNewBatch({required String repId, required String repName}) async {
    if (_activeBatch != null) return _activeBatch!;

    final deviceId = await FieldDeviceId.instance.get();
    final now = DateTime.now().toUtc();
    final count = _batches.length + 1;
    final batch = CensusBatchModel(
      id: const Uuid().v4(),
      repId: repId,
      deviceId: deviceId,
      batchNumber: CensusBatchModel.generateBatchNumber(repName, count),
      startedAt: now,
      status: BatchStatus.draft,
      createdAt: now,
      updatedAt: now,
    );

    await _box.put(batch.id, batch.toJson());
    _batches.insert(0, batch);
    _activeBatch = batch;

    // We don't sync the batch header until it's submitted,
    // OR we sync it immediately as a 'draft'.
    // User wants "Reliably reach PlayMax", so let's enqueue it now.
    await syncService.enqueueSync('census_batches', batch.id, batch.toJson());

    notifyListeners();
    return batch;
  }

  Future<void> incrementRecordCount() async {
    if (_activeBatch == null) return;
    final updated = _activeBatch!.copyWith(
      recordCount: _activeBatch!.recordCount + 1,
    );
    _activeBatch = updated;
    await _box.put(updated.id, updated.toJson());

    // Update the sync queue too so the server knows the latest count
    await syncService.enqueueSync('census_batches', updated.id, updated.toJson());

    // Also update in the list
    final idx = _batches.indexWhere((b) => b.id == updated.id);
    if (idx != -1) _batches[idx] = updated;

    notifyListeners();
  }

  Future<void> submitActiveBatch() async {
    if (_activeBatch == null) return;

    final updated = _activeBatch!.copyWith(
      status: BatchStatus.submitted,
      submittedAt: DateTime.now().toUtc(),
    );

    await _box.put(updated.id, updated.toJson());
    await syncService.enqueueSync('census_batches', updated.id, updated.toJson());

    final idx = _batches.indexWhere((b) => b.id == updated.id);
    if (idx != -1) _batches[idx] = updated;

    _activeBatch = null; // Next census will start a new one
    notifyListeners();
  }
}
