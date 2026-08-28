import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../services/supabase_service.dart';
import '../services/sync_service.dart';

/// How often to attempt a background flush while the app is open and the
/// device is online. Combined with the connectivity-triggered flush, this
/// guarantees captures reach the server shortly after they are made without
/// the user opening the sync screen.
const Duration kAutoFlushInterval = Duration(seconds: 45);

class SyncProvider extends ChangeNotifier {
  SyncProvider() {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results != ConnectivityResult.none;
      _online = online;
      if (online) {
        flush();
      } else {
        notifyListeners();
      }
    });

    _autoTimer = Timer.periodic(kAutoFlushInterval, (_) {
      if (_online && _syncing == false) {
        flush();
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
  final _uuid = const Uuid();

  bool _online = true;
  bool _syncing = false;
  String _deviceId = '';
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

  Future<String> _getDeviceId() async {
    if (_deviceId.isNotEmpty) return _deviceId;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('device_id');
    if (id == null) {
      id = _uuid.v4();
      await prefs.setString('device_id', id);
    }
    _deviceId = id;
    return id;
  }

  /// Flush the local queue to the server. Failures are NEVER silent: the
  /// error is kept in [lastSyncError] (visible in the UI) and the failed
  /// entries stay queued for a retry via [forceSync].
  Future<void> flush() async {
    if (_syncing) return;
    if (!_online) return;
    _syncing = true;
    notifyListeners();
    try {
      final deviceId = await _getDeviceId();
      final result = await syncService.flush(onPush: (entity, rows) async {
        final res = await _supabase.pushSync(deviceId: deviceId, batch: [
          {'entity': entity, 'rows': rows},
        ]);
        if (res is Map && res['error'] != null) {
          return {'error': res['error']};
        }
        return res is Map ? Map<String, dynamic>.from(res) : {'applied': 0};
      });
      await syncService.purgeSynced();

      final error = _firstFlushError(result);
      if (error != null) {
        _lastSyncError = error;
      } else {
        _lastSyncError = null;
      }
    } catch (e) {
      // Network, auth or edge-function failure — entries stay queued and the
      // failure is surfaced so the rep knows the queue did NOT clear.
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