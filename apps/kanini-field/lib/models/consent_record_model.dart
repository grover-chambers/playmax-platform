/// CONSENT_RECORD — §6 lawful basis for every OUTLET_CONTACT and
/// CONSUMER_INTERCEPT.
///
/// Script version, timestamp, GPS, enumerator and what the respondent agreed
/// to. Clause 10.5 makes the reuse right conditional on the script stating:
///   * Playmax Ltd, trading as Market Link, is the data controller in its own
///     right;
///   * data may be retained and reused to provide market intelligence
///     services to other commercial clients;
///   * what is collected and that participation is voluntary;
///   * the right to withdraw and how.
/// The Nice Millers name is deliberately NOT the sole purpose.
class ConsentRecordModel {
  final String id;
  final String scriptVersion;
  final String? respondentRef; // outlet_contact id or intercept id
  final double gpsLat;
  final double gpsLng;
  final String enumeratorId;
  final DateTime consentedAt;
  final bool voluntaryAndWithdrawable;
  final bool reuseAgreed;
  final String? withdrawalPhone;
  final DateTime updatedAt;

  const ConsentRecordModel({
    required this.id,
    required this.scriptVersion,
    this.respondentRef,
    required this.gpsLat,
    required this.gpsLng,
    required this.enumeratorId,
    required this.consentedAt,
    this.voluntaryAndWithdrawable = true,
    this.reuseAgreed = true,
    this.withdrawalPhone,
    required this.updatedAt,
  });

  factory ConsentRecordModel.fromJson(Map<String, dynamic> json) {
    return ConsentRecordModel(
      id: json['id'] as String,
      scriptVersion: json['script_version'] as String? ?? 'v1.0',
      respondentRef: json['respondent_ref'] as String?,
      gpsLat: (json['gps_lat'] as num).toDouble(),
      gpsLng: (json['gps_lng'] as num).toDouble(),
      enumeratorId: json['enumerator_id'] as String? ?? '',
      consentedAt: json['consented_at'] != null
          ? DateTime.parse(json['consented_at'] as String)
          : DateTime.now(),
      voluntaryAndWithdrawable: json['voluntary_and_withdrawable'] as bool? ?? true,
      reuseAgreed: json['reuse_agreed'] as bool? ?? true,
      withdrawalPhone: json['withdrawal_phone'] as String?,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.parse(json['consented_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'script_version': scriptVersion,
      'respondent_ref': respondentRef,
      'gps_lat': gpsLat,
      'gps_lng': gpsLng,
      'enumerator_id': enumeratorId,
      'consented_at': consentedAt.toIso8601String(),
      'voluntary_and_withdrawable': voluntaryAndWithdrawable,
      'reuse_agreed': reuseAgreed,
      'withdrawal_phone': withdrawalPhone,
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
