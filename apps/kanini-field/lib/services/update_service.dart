import 'dart:async';

import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

/// Result of an update check against the `app_versions` table.
class UpdateCheckResult {
  final bool updateAvailable;
  final int currentVersionCode;
  final String? latestVersion;
  final int? latestVersionCode;
  final String? apkUrl;
  final String? notes;

  /// True when `updates.force_update` is set in `app_settings`: the alert
  /// becomes non-dismissable until the rep updates.
  final bool forceUpdate;

  const UpdateCheckResult({
    required this.updateAvailable,
    required this.currentVersionCode,
    this.latestVersion,
    this.latestVersionCode,
    this.apkUrl,
    this.notes,
    this.forceUpdate = false,
  });
}

/// Checks the rep app's own version against the latest published release and
/// prompts the user to download the new APK when one is available.
///
/// Always active (no demo gating). The check tolerates offline/unreachable
/// state: if the `app_versions` table or the `app_settings` table cannot be
/// read, the check fails silently to "no update" / "dismissable".
class UpdateService {
  static final UpdateService instance = UpdateService._();

  UpdateService._();

  Future<PackageInfo> _info() => PackageInfo.fromPlatform();

  /// Latest manifest row, or null if the table is unreachable/empty.
  Future<Map<String, dynamic>?> _latestRelease() async {
    try {
      final client = Supabase.instance.client;
      final res = await client
          .from('app_versions')
          .select('version_name,version_code,apk_url,notes,is_latest')
          .eq('is_latest', true)
          .limit(1)
          .maybeSingle()
          .timeout(const Duration(seconds: 8));
      return res;
    } catch (_) {
      // Offline or table missing — treat as no update.
      return null;
    }
  }

  /// Reads `updates.force_update` from `app_settings`. Unreachable/missing
  /// settings fall back to `false` (dismissable alert).
  Future<bool> _isForceUpdate() async {
    try {
      final client = Supabase.instance.client;
      final res = await client
          .from('app_settings')
          .select('value')
          .eq('key', 'updates.force_update')
          .maybeSingle()
          .timeout(const Duration(seconds: 8));
      if (res == null) return false;
      final value = res['value'];
      if (value is bool) return value;
      if (value is String) return value.trim().toLowerCase() == 'true';
      return false;
    } catch (_) {
      // Offline, table missing, or not signed in yet — dismissable fallback.
      return false;
    }
  }

  /// Version comparison is build-number based (`version_code` from
  /// pubspec `1.0.0+3` -> monotonic int), which is strictly comparable even
  /// when `version_name` strings diverge (1.0.10 vs 1.0.9).
  Future<UpdateCheckResult> check() async {
    final info = await _info();
    final code = int.tryParse(info.buildNumber) ?? 1;
    final release = await _latestRelease();
    if (release == null) {
      return UpdateCheckResult(updateAvailable: false, currentVersionCode: code);
    }
    final latestCode = (release['version_code'] as num?)?.toInt() ?? 0;
    final force = await _isForceUpdate();
    return UpdateCheckResult(
      updateAvailable: latestCode > code,
      currentVersionCode: code,
      latestVersion: release['version_name'] as String?,
      latestVersionCode: latestCode,
      apkUrl: release['apk_url'] as String?,
      notes: release['notes'] as String?,
      forceUpdate: force,
    );
  }

  /// Show the version-sync alert. Called from the dashboard so the update is
  /// the first prominent thing a rep sees. Non-dismissable when the
  /// `updates.force_update` setting is true (no "Later", no barrier tap-out);
  /// otherwise the rep may defer. The alert opens the public `apk_url`
  /// (public `app-releases` storage URL) in the browser.
  Future<void> promptIfAvailable(BuildContext context) async {
    final result = await check();
    if (!result.updateAvailable || result.apkUrl == null || !context.mounted) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: !result.forceUpdate,
      builder: (ctx) => AlertDialog(
        title: const Text('Update available'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kanini Field v${result.latestVersion} is ready to install.',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            if (result.notes != null) ...[
              const SizedBox(height: 8),
              Text(result.notes!, style: const TextStyle(fontSize: 12)),
            ],
            if (result.forceUpdate) ...[
              const SizedBox(height: 10),
              const Text(
                'This update is required before you can continue working.',
                style: TextStyle(fontSize: 12.5, color: Colors.redAccent),
              ),
            ],
          ],
        ),
        actions: [
          if (!result.forceUpdate)
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Later'),
            ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              launchUrl(Uri.parse(result.apkUrl!),
                  mode: LaunchMode.externalApplication);
            },
            child: Text(result.forceUpdate ? 'Update now' : 'Update'),
          ),
        ],
      ),
    );
  }
}

/// Backfill so `updateService` naming stays consistent across the codebase.
final updateService = UpdateService.instance;