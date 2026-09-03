import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Single source of truth for the device id used across login/sync logging
/// and the `sync-push` payload. Stable per install (persisted in prefs).
class FieldDeviceId {
  static final FieldDeviceId instance = FieldDeviceId._();
  FieldDeviceId._();

  final _uuid = const Uuid();
  String? _id;

  Future<String> get() async {
    if (_id != null) return _id!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('device_id');
    if (id == null) {
      id = _uuid.v4();
      await prefs.setString('device_id', id);
    }
    _id = id;
    return id;
  }
}
