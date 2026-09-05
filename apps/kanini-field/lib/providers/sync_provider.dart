import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

import '../services/access_log_service.dart';
import '../services/device_id.dart';
import '../services/supabase_service.dart';
import '../services/sync_service.dart';

/// How often to attempt a background flush while the app is open and the
/// device is online. Combined with the connectivity-triggered flush, this
/// guarantees captures reach the server shortly after they are made without
/// the user opening the sync screen.
const Duration kAutoFlushInterval = Duration(seconds: 45);

/// How many [flushBatch] passes the reconnect handler runs back-to-back so a
/// large backlog drains across one reconnect without holding the UI thread for
/// minutes (each pass is small and crash-safe). Left-over rows simply resume on
/// the 45s auto-flush timer.
const int kReconnectDrainPasses = 3;

class SyncProvider extends ChangeNotifier {
  SyncProvider() {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results != ConnectivityResult.none;
      _online = online;
      if (online) {
        _drainOnReconnect();
      } else {
        notifyListeners();
      }
    });

    _autoTimer = Timer.periodic(kAutoFlushInterval, (_) {
      if (_online && _syncing == false) {
        flushBatch();
      }
    });
  }

  Timer? _autoTimer;
  StreamSubscription<ConnectivityResult>? _connectivitySub;

  @override
  void dispose() {
    _autoTimer?.cancel();
    _connectivitySub?.cancel();
    super.dispose();
  }

  final SupabaseService _supabase = SupabaseService.instance;

  bool _online = true;
  bool _syncing = false;
  String? _lastSyncError;

  bool get isOnline => _online;
  bool get isSyncing => _syncing;
  int get pendingCount => syncService.pendingCount;

  /// Human-readable reason for the most recent failed flush. Null when the
  /// last flush succeeded (or nothing was pending).
  String? get lastSyncError => _lastSyncError;
  bool get hasSyncErrors => _lastSyncError != null;

  /// Clears the visible error state (e.g. after the rep dismisses it).
  void clearSyncError() {
    if (_lastSyncError == null) return;
    _lastSyncError = null;
    notifyListeners();
  }

  Future<String> _getDeviceId() async => FieldDeviceId.instance.get();

  /// Builds the [SyncService.onPush]-compatible callback that fires the
  /// `sync-push` edge function for one entity/rows batch and folds any
  /// server-side error into the result map.
  /// Also returns the resolved [deviceId] so the caller can log a heartbeat.
  Future<
      ({
        String deviceId,
        Future<Map<String, dynamic>> Function(String entity, List<dynamic> rows) push,
      })> _push() async {
    final deviceId = await _getDeviceId();
    return (
      deviceId: deviceId,
      push: (entity, rows) async {
        final res = await _supabase.pushSync(deviceId: deviceId, batch: [
          {'entity': entity, 'rows': rows},
        ]);
        if (res is Map && res['error'] != null) {
          return {'error': res['error']};
        }
        return res is Map ? Map<String, dynamic>.from(res) : {'applied': 0};
      },
    );
  }

  /// Retry any photo binaries that failed to upload at capture time. Best-effort;
  /// never fails the surrounding sync on a media upload problem.
  Future<void> _drainMedia() async {
    try {
      final repId =
          await SupabaseService.instance.resolveProfileId() ?? _supabase.currentUser?.id;
      await syncService.flushPendingMedia(onUpload: (rec) async {
        final filePath = rec['file_path'] as String?;
        final photoId = rec['row_id'] as String?;
        final recRepId = (rec['rep_id'] as String?)?.isNotEmpty == true
            ? rec['rep_id'] as String
            : repId;
        if (filePath == null || photoId == null || recRepId == null) {
          return false;
        }
        final file = File(filePath);
        if (!await file.exists()) {
          return true; // origin lost — abandon; metadata row still syncs
        }
        try {
          final bytes = await file.readAsBytes();
          await _supabase.uploadShelfPhoto(recRepId, photoId, bytes);
          return true;
        } catch (_) {
          return false; // retry later
        }
      });
    } catch (_) {
      // best-effort
    }
  }

  /// Shared post-drain bookkeeping: surface the first error (never silent),
  /// else clear it and record a sync heartbeat.
  Future<void> _finalize(String deviceId, Map<String, dynamic> result) async {
    final error = _firstFlushError(result);
    if (error != null) {
      _lastSyncError = error;
    } else {
      _lastSyncError = null;
      final flushed = result['flushed'];
      if (flushed is int && flushed > 0) {
        final email = _supabase.currentUser?.email;
        if (email != null) {
          await AccessLogService.instance.logSync(email, deviceId);
        }
      }
    }
  }

  /// Flush the LOCAL BATCH (bounded by [SyncService.kBatchRows]). This is the
  /// path used on reconnect and by the 45s auto-flush timer so large backlogs
  /// drain in small, crash-safe passes instead of one all-or-nothing pass.
  /// Failures are NEVER silent: the error is kept in [lastSyncError] and the
  /// failed entries stay queued for a retry via [forceSync].
  Future<void> flushBatch() async {
    if (_syncing) return;
    if (!_online) return;
    _syncing = true;
    notifyListeners();
    try {
      final p = await _push();
      final result = await syncService.flushBatch(onPush: p.push);
      await _drainMedia();
      await _finalize(p.deviceId, result);
    } catch (e) {
      _lastSyncError = 'Sync failed: $e';
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  /// Flush the ENTIRE local queue to the server now, drained in bounded,
  /// crash-safe passes. Used by the "Sync now" / Retry buttons so a rep can
  /// force a full drain without ever loading the whole backlog into memory at
  /// once. Failures are NEVER silent and remaining rows stay queued.
  Future<void> flush() => flushBeforeShiftEnd();

  /// Full (reconnect) drain: run a few [flushBatch] passes back-to-back on a
  /// single reconnect so a large backlog makes real progress, then stop and let
  /// the background timer finish the rest. Never blocks the UI thread too long
  /// because each pass is bounded and crash-safe.
  Future<void> _drainOnReconnect() async {
    for (var i = 0; i < kReconnectDrainPasses; i++) {
      if (!_online || _syncing) break;
      await flushBatch();
    }
  }

  /// Flush ALL pending metadata now, bounded per pass — used at end-of-shift so
  /// the rep clocks out with an empty (or near-empty) queue. Loops until the
  /// queue is clear, connectivity drops, or no forward progress is possible.
  /// Best-effort: shifts still end even if the network is unavailable.
  Future<void> flushBeforeShiftEnd({void Function(int remaining)? onProgress}) async {
    if (_online == false) {
      onProgress?.call(syncService.pendingCount);
      return;
    }
    _syncing = true;
    notifyListeners();
    try {
      final p = await _push();
      final result = await syncService.flushBeforeShiftEnd(
        onPush: p.push,
        onProgress: onProgress,
      );
      await _drainMedia();
      await _finalize(p.deviceId, result);
    } catch (e) {
      _lastSyncError = 'Sync failed: $e';
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }

  /// Retry a failed flush. Kept as an explicit entry point so UI affordances
  /// ("Retry") read clearly; it is the same code path as [flush].
  Future<void> retry() => flush();

  Future<void> forceSync() => flush();

  /// Scans a flush result for the first failure worth showing: a top-level
  /// transport error or any entity whose server response carried an `error`.
  String? _firstFlushError(Map<String, dynamic> result) {
    if (result['error'] != null) {
      return 'Sync failed: ${result['error']}';
    }
    final applied = result['applied'];
    if (applied is Map) {
      for (final entry in applied.entries) {
        final res = entry.value;
        if (res is Map && res['error'] != null) {
          return 'Sync failed for ${entry.key}: ${res['error']}';
        }
      }
    }
    return null;
  }
}