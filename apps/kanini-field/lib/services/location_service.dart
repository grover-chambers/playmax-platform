import 'dart:math' as math;

import 'package:geolocator/geolocator.dart';

import '../config/field_config.dart';

class LocationService {
  LocationService();

  /// Cached last-known position to avoid cold GPS starts.
  Position? _lastKnown;

  /// Request permission and return the current position.
  /// Uses cached last-known position first (instant) for UI responsiveness,
  /// then fires a live fix in the background.
  Future<Position?> getCurrentPosition() async {
    // 1. Check services enabled
    if (!await Geolocator.isLocationServiceEnabled()) {
      await Geolocator.openLocationSettings();
      return null;
    }

    // 2. Check / request permission
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) return null;
    if (permission != LocationPermission.whileInUse &&
        permission != LocationPermission.always) {
      return null;
    }

    // 3. Try cached position first (instant, ~0ms)
    final cached = await Geolocator.getLastKnownPosition();
    if (cached != null) {
      _lastKnown = cached;
      // Fire-and-forget live fix to refresh cache
      _refreshInBackground();
      return cached;
    }

    // 4. Cold start — cap the wait so the UI doesn't block forever
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
      _lastKnown = pos;
      return pos;
    } catch (_) {
      return _lastKnown;
    }
  }

  /// Background refresh — updates cache for next call. Fire-and-forget.
  void _refreshInBackground() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
      _lastKnown = pos;
    } catch (_) {}
  }

  /// Quick GPS fix with tight timeout for the check-in lock flow.
  /// Returns null on failure — never blocks the UI for more than [timeout].
  Future<Position?> quickFix({Duration timeout = const Duration(seconds: 8)}) async {
    // Try cached first
    final cached = await Geolocator.getLastKnownPosition();
    if (cached != null && cached.accuracy <= FieldConfig.gpsAcceptM) {
      _lastKnown = cached;
      return cached;
    }
    // Live fix with timeout
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: timeout,
      );
      _lastKnown = pos;
      return pos;
    } catch (_) {
      return _lastKnown;
    }
  }

  /// Stabilise GPS: take N samples and return the average position.
  /// Uses [quickFix] per sample so no single fix blocks for more than 8s.
  Future<(double lat, double lng)?> stabiliseFixes({
    int minSamples = 3,
    int maxSeconds = 15,
  }) async {
    final List<Position> fixes = [];
    final start = DateTime.now();

    while (DateTime.now().difference(start).inSeconds < maxSeconds) {
      final remaining = maxSeconds - DateTime.now().difference(start).inSeconds;
      final fix = await quickFix(
        timeout: Duration(seconds: math.min(8, remaining > 0 ? remaining : 1)),
      );
      if (fix != null) {
        fixes.add(fix);
        if (fixes.length >= minSamples) {
          final avgLat =
              fixes.map((f) => f.latitude).reduce((a, b) => a + b) / fixes.length;
          final avgLng =
              fixes.map((f) => f.longitude).reduce((a, b) => a + b) / fixes.length;
          final maxRadius = fixes
              .map((f) => _haversineDistance(f.latitude, f.longitude, avgLat, avgLng))
              .reduce((a, b) => a > b ? a : b);
          if (maxRadius <= FieldConfig.gpsStabiliseToleranceM) {
            return (avgLat, avgLng);
          }
        }
      }
      await Future.delayed(const Duration(seconds: 1));
    }
    return null;
  }

  /// Check if we have GPS permission.
  Future<LocationPermission> checkPermission() async {
    return await Geolocator.checkPermission();
  }

  /// Get the GPS accuracy in meters from the last position fix.
  Future<double?> getLastAccuracy() async {
    final position = await Geolocator.getLastKnownPosition();
    return position?.accuracy;
  }

  double _haversineDistance(double lat1, double lng1, double lat2, double lng2) {
    const R = 6371000;
    final dLat = (lat2 - lat1) * 3.14159 / 180;
    final dLng = (lng2 - lng1) * 3.14159 / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * 3.14159 / 180) *
            math.cos(lat2 * 3.14159 / 180) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return 2 * R * math.asin(math.sqrt(a));
  }
}

/// Global location service instance.
final LocationService locationService = LocationService();
