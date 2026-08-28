import '../domain/typology.dart';

/// 4.3 OUTLET_CONTACT — personal data, minimise (§4.3).
///
/// Deliberately does NOT collect: national ID, DOB, photograph of a person,
/// gender, age, ethnicity, religion. Each [ConsentRecordModel] is referenced
/// by [consentId]; a contact without consent is a compliance violation and is
/// rejected by [CensusService].
class OutletContactModel {
  final String id;
  final String outletId;
  final String? contactName;
  final String? roleCode;
  final String? phonePrimary;
  final String? phoneAlt;
  final String? preferredLanguage;
  final bool isDecisionMaker;
  final String? consentId;

  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  const OutletContactModel({
    required this.id,
    required this.outletId,
    this.contactName,
    this.roleCode,
    this.phonePrimary,
    this.phoneAlt,
    this.preferredLanguage,
    this.isDecisionMaker = false,
    this.consentId,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  ContactRole? get role => ContactRole.fromCode(roleCode);

  factory OutletContactModel.fromJson(Map<String, dynamic> json) {
    return OutletContactModel(
      id: json['id'] as String,
      outletId: json['outlet_id'] as String,
      contactName: json['contact_name'] as String?,
      roleCode: json['role'] as String?,
      phonePrimary: json['phone_primary'] as String?,
      phoneAlt: json['phone_alt'] as String?,
      preferredLanguage: json['preferred_language'] as String?,
      isDecisionMaker: json['is_decision_maker'] as bool? ?? false,
      consentId: json['consent_id'] as String?,
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
      'contact_name': contactName,
      'role': roleCode,
      'phone_primary': phonePrimary,
      'phone_alt': phoneAlt,
      'preferred_language': preferredLanguage,
      'is_decision_maker': isDecisionMaker,
      'consent_id': consentId,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}
