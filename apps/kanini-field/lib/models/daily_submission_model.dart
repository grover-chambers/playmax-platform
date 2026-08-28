/// DAILY_SUBMISSION — §5 "Daily close".
///
/// Supervisors review every submission the same evening; nothing carries over.
/// A day's captured records are grouped under one submission so a supervisor
/// can approve, flag for back-check or reject the whole batch.
class DailySubmissionModel {
  final String id;
  final String enumeratorId;
  final String submissionDate; // YYYY-MM-DD
  final int outletCount;
  final int interceptCount;
  final int visitCount;
  final List<String> qualityFlags;
  final String status; // draft | submitted | approved | needs-rework
  final String? supervisorNote;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? approvedAt;

  const DailySubmissionModel({
    required this.id,
    required this.enumeratorId,
    required this.submissionDate,
    this.outletCount = 0,
    this.interceptCount = 0,
    this.visitCount = 0,
    this.qualityFlags = const [],
    this.status = 'draft',
    this.supervisorNote,
    required this.createdAt,
    required this.updatedAt,
    this.approvedAt,
  });

  factory DailySubmissionModel.fromJson(Map<String, dynamic> json) {
    List<String> l(dynamic v) {
      if (v is List) return v.map((e) => e.toString()).toList();
      return const [];
    }

    return DailySubmissionModel(
      id: json['id'] as String,
      enumeratorId: json['enumerator_id'] as String? ?? '',
      submissionDate: json['submission_date'] as String? ?? '',
      outletCount: json['outlet_count'] as int? ?? 0,
      interceptCount: json['intercept_count'] as int? ?? 0,
      visitCount: json['visit_count'] as int? ?? 0,
      qualityFlags: l(json['quality_flags']),
      status: json['status'] as String? ?? 'draft',
      supervisorNote: json['supervisor_note'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
      approvedAt: json['approved_at'] != null
          ? DateTime.parse(json['approved_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'enumerator_id': enumeratorId,
      'submission_date': submissionDate,
      'outlet_count': outletCount,
      'intercept_count': interceptCount,
      'visit_count': visitCount,
      'quality_flags': qualityFlags,
      'status': status,
      'supervisor_note': supervisorNote,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'approved_at': approvedAt?.toIso8601String(),
    };
  }
}

/// BACK_CHECK — §5. The single most important quality control.
///
/// Supervisors independently re-visit 5–10% of each enumerator's outlets
/// weekly and re-record blind. Results are matched against the original
/// census record to detect falsified field work.
class BackCheckModel {
  final String id;
  final String outletId;
  final String enumeratorId;
  final String supervisorId;
  final DateTime reVisitedAt;
  final double gpsLat;
  final double gpsLng;
  final bool businessMatches;
  final bool openForBusiness;
  final String? discrepancy;
  final String status; // pending | passed | failed
  final DateTime createdAt;
  final DateTime updatedAt;

  const BackCheckModel({
    required this.id,
    required this.outletId,
    required this.enumeratorId,
    required this.supervisorId,
    required this.reVisitedAt,
    required this.gpsLat,
    required this.gpsLng,
    this.businessMatches = true,
    this.openForBusiness = true,
    this.discrepancy,
    this.status = 'pending',
    required this.createdAt,
    required this.updatedAt,
  });

  factory BackCheckModel.fromJson(Map<String, dynamic> json) {
    return BackCheckModel(
      id: json['id'] as String,
      outletId: json['outlet_id'] as String,
      enumeratorId: json['enumerator_id'] as String? ?? '',
      supervisorId: json['supervisor_id'] as String? ?? '',
      reVisitedAt: json['revisited_at'] != null
          ? DateTime.parse(json['revisited_at'] as String)
          : DateTime.now(),
      gpsLat: (json['gps_lat'] as num).toDouble(),
      gpsLng: (json['gps_lng'] as num).toDouble(),
      businessMatches: json['business_matches'] as bool? ?? true,
      openForBusiness: json['open_for_business'] as bool? ?? true,
      discrepancy: json['discrepancy'] as String?,
      status: json['status'] as String? ?? 'pending',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'outlet_id': outletId,
      'enumerator_id': enumeratorId,
      'supervisor_id': supervisorId,
      'revisited_at': reVisitedAt.toIso8601String(),
      'gps_lat': gpsLat,
      'gps_lng': gpsLng,
      'business_matches': businessMatches,
      'open_for_business': openForBusiness,
      'discrepancy': discrepancy,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
