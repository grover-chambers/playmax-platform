import '../models/visit_model.dart';

/// NAMPARK RMS transport seam.
///
/// The ONLY boundary through which Kanini Field talks to the operational
/// backend. SupabaseService currently implements the sync half; when the
/// Step 3 API contract lands it is swapped behind this interface without
/// touching providers or services above it.
///
/// Endpoint paths below are CAPABILITY PLACEHOLDERS from the alignment spec
/// (§15/§18) — do not ship HTTP calls against them until the contract exists.
abstract class NamparkApi {
  // ---- Auth ----
  Future<ApiSession> login(String email, String password);
  Future<ApiSession> refresh(String refreshToken);

  // ---- Identity / device ----
  Future<ApiProfile> me();
  Future<void> registerDevice(String deviceId, String platform);

  // ---- Assignment ----
  Future<List<Map<String, dynamic>>> assignedRoutes();
  Future<List<Map<String, dynamic>>> routeOutlets(String routeId);

  // ---- Visits ----
  Future<void> createVisit(Visit visit);
  Future<void> updateVisit(Visit visit);
  Future<void> submitVisit(String visitId);

  // ---- Sync ----
  /// Batch push of queued rows grouped by entity, parents before children.
  /// Must be idempotent per row id.
  Future<Map<String, dynamic>> syncBatch(
      String deviceId, Map<String, List<Map<String, dynamic>>> batches);

  // ---- Configuration ----
  Future<Map<String, dynamic>> mobileConfig();

  // ---- Safety ----
  Future<List<Map<String, dynamic>>> safetyContacts();
}

class ApiSession {
  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;

  const ApiSession(this.accessToken, this.refreshToken, this.expiresAt);
}

class ApiProfile {
  final String id;
  final String? fullName;
  final String? email;
  final String? role;
  final String? tenantId;
  final String? zone;

  const ApiProfile(
      {required this.id,
      this.fullName,
      this.email,
      this.role,
      this.tenantId,
      this.zone});
}
