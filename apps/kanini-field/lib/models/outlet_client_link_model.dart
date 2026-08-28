/// OUTLET_CLIENT_LINK — status per client (§3.3).
///
/// The same outlet is a Nice Millers customer AND a Kerugoya prospect at the
/// same time. The status lives here, keyed by client, never on the outlet.
class OutletClientLinkModel {
  final String id;
  final String outletId;
  final String clientId;
  final String statusCode;
  final String? note;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  const OutletClientLinkModel({
    required this.id,
    required this.outletId,
    required this.clientId,
    required this.statusCode,
    this.note,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory OutletClientLinkModel.fromJson(Map<String, dynamic> json) {
    return OutletClientLinkModel(
      id: json['id'] as String,
      outletId: json['outlet_id'] as String,
      clientId: json['client_id'] as String? ?? '',
      statusCode: json['status'] as String? ?? 'prospect',
      note: json['note'] as String?,
      createdBy: json['created_by'] as String? ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'outlet_id': outletId,
      'client_id': clientId,
      'status': statusCode,
      'note': note,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}
