import 'dart:async';
import 'dart:math' as math;

import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/field_config.dart';
import '../services/supabase_service.dart';

/// Background GPS pinging service — sends live location to the War Room
/// every [interval] while the app is running (foreground or background).
/// Runs independently of check-in / visit GPS captures.
class LocationPingService {
  LocationPingService._();
  static final LocationPingService instance = LocationPingService._();

  Timer? _timer;
  bool _running = false;
  Position? _lastSent;
  DateTime? _lastSentAt;

  /// How often to ping location to the server.
  /// 2 minutes balances real-time feel with battery/bandwidth.
  static const Duration pingInterval = Duration(minutes: 2);

  /// Minimum distance (meters) before sending a new ping — avoids
  /// spamming the server when the rep is stationary.
  static const double minDistanceM = 50.0;

  /// Maximum GPS accuracy (meters) to accept for a ping.
  static const double maxAccuracyM = FieldConfig.gpsAcceptM * 2; // 40m

  Future<void> start() async {
    if (_running) return;

    // Check permissions upfront
    final perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.deniedForever ||
        perm != LocationPermission.whileInUse && perm != LocationPermission.always) {
      return; // Silently don't start — no permission
    }

    _running = true;
    _timer = Timer.periodic(pingInterval, (_) => _ping());
    // Fire first ping immediately
    unawaited(_ping());
  }

  Future<void> stop() async {
    _timer?.cancel();
    _timer = null;
    _running = false;
    _lastSent = null;
    _lastSentAt = null;
  }

  Future<void> _ping() async {
    if (!_running) return;

    try {
      // Check if app has a valid session
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) return; // Not signed in — skip

      // Get GPS (use last known for speed, then live fix)
      Position? pos;
      final cached = await Geolocator.getLastKnownPosition();
      if (cached != null && cached.accuracy <= maxAccuracyM) {
        pos = cached;
      } else {
        try {
          pos = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: const Duration(seconds: 10),
          );
        } catch (_) {
          // Fallback to cached even if accuracy is worse
          pos = cached;
        }
      }

      if (pos == null) return;

      // Distance gate — don't ping if we haven't moved much
      if (_lastSent != null) {
        final dist = _haversineDistance(
          _lastSent!.latitude,
          _lastSent!.longitude,
          pos.latitude,
          pos.longitude,
        );
        if (dist < minDistanceM) return;
      }

      // Battery info (best effort)
      int? batteryPct;
      bool? isCharging;
      // Note: Flutter doesn't have a built-in battery API; this would need
      // a plugin like `battery_plus`. Omitted for now — nullable.

      // Send to server
      final supabase = SupabaseService.instance;
      await supabase.pingLocation(
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        altitude: pos.altitude,
        speed: pos.speed * 3.6, // m/s -> km/h
        heading: pos.heading,
        batteryPct: batteryPct,
        isCharging: isCharging,
        source: 'app_background',
      );

      _lastSent = pos;
      _lastSentAt = DateTime.now();
    } catch (e) {
      // Silently ignore — pinging is best-effort telemetry
      // print('Location ping failed: $e');
    }
  }

  double _haversineDistance(double lat1, double lng1, double lat2, double lng2) {
    const R = 6371000;
    final dLat = (lat2 - lat1) * math.pi / 180;
    final dLng = (lng2 - lng1) * math.pi / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180) *
            math.cos(lat2 * math.pi / 180) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return 2 * R * math.asin(math.sqrt(a));
  }
}