import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Day-gated shift clocking with automatic timeouts.
///
/// Reps can stay logged in across days, so the app forces a shift check-in at
/// the start of every calendar day (midnight reset). No rep operation is
/// reachable until they clock in for the current day.
///
/// Timeouts protect against forgotten shifts:
///  - [inactivityTimeout]: a rep that stops registering activity (e.g. left the
///    device running) is clocked out automatically.
///  - [maxShift]: no single shift can run longer than this.
class ShiftProvider extends ChangeNotifier {
  static const _inAtKey = 'shift_in_at';
  static const _outAtKey = 'shift_out_at';
  static const _inDateKey = 'shift_in_date';
  static const _lastActivityKey = 'shift_last_activity_at';

  /// Rep considered idle (and clocked out) after this long without activity.
  static const Duration inactivityTimeout = Duration(hours: 4);

  /// Hard ceiling on a single shift's duration.
  static const Duration maxShift = Duration(hours: 16);

  DateTime? _inAt;
  DateTime? _outAt;
  String? _inDate;
  DateTime? _lastActivityAt;
  String? _timeoutReason;
  Timer? _timer;

  DateTime? get inAt => _inAt;
  DateTime? get outAt => _outAt;
  String? get timeoutReason => _timeoutReason;

  String _todayKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// True when the rep has not clocked in for the current calendar day. This is
  /// the gate the whole app is held behind — and it re-arms automatically at
  /// midnight, so a forgotten shift resets at the start of the following day.
  bool get needsClockIn {
    final today = _todayKey(DateTime.now());
    return _inDate != today || _inAt == null;
  }

  bool get clockedIn => !needsClockIn && _outAt == null;
  bool get clockedOut => !needsClockIn && _outAt != null;

  Duration get timeOnShift {
    if (_inAt == null) return Duration.zero;
    return (_outAt ?? DateTime.now()).difference(_inAt!);
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _inAt = _ms(prefs.getInt(_inAtKey));
    _outAt = _ms(prefs.getInt(_outAtKey));
    _inDate = prefs.getString(_inDateKey);
    _lastActivityAt = _ms(prefs.getInt(_lastActivityKey));
    _timeoutReason = null;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => autoCheck());
    notifyListeners();
  }

  static DateTime? _ms(int? ms) => ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms);

  /// Records rep activity so the inactivity timeout is measured against real
  /// field work rather than the clock-in time. Called from capture providers.
  Future<void> touch() async {
    _lastActivityAt = DateTime.now();
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_lastActivityKey, _lastActivityAt!.millisecondsSinceEpoch);
  }

  /// Idle timer check. Runs automatically once a minute while the app is open.
  Future<void> autoCheck() async {
    if (needsClockIn) return;
    final now = DateTime.now();
    if (_outAt != null) return;
    if (_lastActivityAt != null && now.difference(_lastActivityAt!) > inactivityTimeout) {
      await _clockOut(reason: 'inactivity (no field activity for ${inactivityTimeout.inHours}h)');
    } else if (now.difference(_inAt!) > maxShift) {
      await _clockOut(reason: 'max shift duration (${maxShift.inHours}h) exceeded');
    }
  }

  Future<void> clockIn() async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    _inAt = now;
    _outAt = null;
    _inDate = _todayKey(now);
    _lastActivityAt = now;
    _timeoutReason = null;
    await prefs.setInt(_inAtKey, now.millisecondsSinceEpoch);
    await prefs.setString(_inDateKey, _inDate!);
    await prefs.setInt(_lastActivityKey, now.millisecondsSinceEpoch);
    await prefs.remove(_outAtKey);
    notifyListeners();
  }

  Future<void> clockOut() => _clockOut(reason: null);

  Future<void> _clockOut({String? reason}) async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    _outAt = now;
    _timeoutReason = reason;
    await prefs.setInt(_outAtKey, now.millisecondsSinceEpoch);
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}