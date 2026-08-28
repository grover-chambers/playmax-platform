import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Lightweight view of the signed-in user (Supabase auth session only).
class AppUser {
  final String id;
  final String? email;
  final String? fullName;

  /// Market Link cluster the account belongs to (e.g. "Eastern Corridor").
  /// Null for accounts without a zone (super admins, the CEO).
  final String? zone;

  const AppUser({required this.id, this.email, this.fullName, this.zone});
}

class AuthProvider extends ChangeNotifier {
  AuthProvider() {
    try {
      final client = Supabase.instance.client;
      _user = _toAppUser(client.auth.currentUser);
      client.auth.onAuthStateChange.listen((data) {
        _user = _toAppUser(data.session?.user);
        notifyListeners();
      });
    } catch (_) {
      // Supabase not initialized (e.g. widget tests, or a boot that slipped
      // past main's fail-closed gate). The provider stays UNAUTHENTICATED —
      // there is no demo fallback; the app remains locked behind login.
    }
  }

  bool _loading = false;
  String? _error;
  AppUser? _user;

  AppUser? get currentUser => _user;
  bool get isLoading => _loading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  /// V1 is password-only auth: the OTP challenge screen is not built yet, so
  /// a successful password sign-in grants full access. This flips to a
  /// real verification gate once the `auth-otp` / `auth-verify-otp` edge
  /// functions are deployed and the OTP entry screen ships.
  bool get isOTPVerified => true;

  String get displayName => _user?.fullName ?? _user?.email ?? 'Field Rep';

  /// Real credentials only. Any failure (wrong email/password, disabled
  /// account, network error) surfaces on the login form — nothing is accepted
  /// locally.
  Future<void> signIn(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final client = Supabase.instance.client;
      final data =
          await client.auth.signInWithPassword(email: email, password: password);
      _user = _toAppUser(data.user);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {
      // Best-effort server logout; local session is always cleared so the
      // device never stays authenticated after the rep taps Log out.
    }
    _user = null;
    notifyListeners();
  }

  AppUser? _toAppUser(User? user) {
    if (user == null) return null;
    return AppUser(
      id: user.id,
      email: user.email,
      fullName: user.userMetadata?['full_name'] as String?,
      zone: user.userMetadata?['zone'] as String?,
    );
  }
}

extension AuthProviderX on AuthProvider {
  bool get canAccessFeatures => isAuthenticated && isOTPVerified;
}