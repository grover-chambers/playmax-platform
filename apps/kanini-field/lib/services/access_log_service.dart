import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Write-audit seam for the `rep_access_events` table (Kanini Field / census
/// DB). Records each observed activity (login, sync, open) with the rep's
/// email, device id and the exact app build they ran. Purely best-effort:
/// a network/blip failure to log must NEVER break the capture flow, so every
/// call swallows errors.
class AccessLogService {
  AccessLogService._();
  static final AccessLogService instance = AccessLogService._();

  Future<({String version, int build})> _appVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final build = int.tryParse(info.buildNumber) ?? 1;
      return (version: info.version, build: build);
    } catch (_) {
      return (version: 'unknown', build: 0);
    }
  }

  Future<void> _record(String email, String? deviceId, String event) async {
    try {
      final client = Supabase.instance.client;
      final v = await _appVersion();
      await client.from('rep_access_events').insert({
        'rep_email': email,
        'device_id': deviceId,
        'event_type': event,
        'app_version': v.version,
        'version_code': v.build,
      }).timeout(const Duration(seconds: 6));
    } catch (_) {
      // Best-effort only — never throw into the capture path.
    }
  }

  Future<void> logLogin(String email, String? deviceId) =>
      _record(email, deviceId, 'login');

  Future<void> logSync(String email, String? deviceId) =>
      _record(email, deviceId, 'sync');

  Future<void> logOpen(String email, String? deviceId) =>
      _record(email, deviceId, 'open');
}
