class Visit {
  final String id;
  final String outletId;
  final String outletName;
  final String retailerId;
  final String repId;
  final String userId;
  final DateTime checkInAt;
  DateTime? checkOutAt;
  final double gpsLat;
  final double gpsLng;
  final double? gpsAccuracy;
  final int radiusM;
  final bool gpsVerified;
  final String verificationMethod; // 'gps+photo' | 'gps' | 'qr' | 'nfc' | 'override'
  final String outcome;
  final int durationMin;
  final bool stockCaptured;
  final int photoCount;
  final bool orderPlaced;
  final double? orderValue;
  final String? notes;
  final String verificationSource; // 'gps' | 'qr' | 'photo_front' | 'photo_shelf' | 'override'
  final String? overrideReason;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  Visit({
    required this.id,
    required this.outletId,
    required this.outletName,
    required this.retailerId,
    required this.repId,
    required this.userId,
    required this.checkInAt,
    this.checkOutAt,
    required this.gpsLat,
    required this.gpsLng,
    this.gpsAccuracy,
    this.radiusM = 5,
    this.gpsVerified = false,
    this.verificationMethod = 'gps+photo',
    this.verificationSource = 'gps',
    this.outcome = 'COMPLETE',
    this.durationMin = 0,
    this.stockCaptured = false,
    this.photoCount = 0,
    this.orderPlaced = false,
    this.orderValue,
    this.notes,
    this.overrideReason,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory Visit.fromJson(Map<String, dynamic> json) {
    return Visit(
      id: json['id'] as String,
      outletId: json['outlet_id'] as String,
      outletName: json['outlet_name'] as String? ?? '',
      retailerId: json['retailer_id'] as String,
      repId: json['rep_id'] as String,
      userId: json['user_id'] as String,
      checkInAt: DateTime.parse(json['check_in_at'] as String),
      checkOutAt: json['check_out_at'] != null
          ? DateTime.parse(json['check_out_at'] as String)
          : null,
      gpsLat: (json['gps_lat'] as num).toDouble(),
      gpsLng: (json['gps_lng'] as num).toDouble(),
      gpsAccuracy: json['gps_accuracy'] != null
          ? (json['gps_accuracy'] as num).toDouble()
          : null,
      radiusM: json['radius_m'] as int? ?? 5,
      gpsVerified: json['gps_verified'] as bool? ?? false,
      verificationMethod: json['verification_method'] as String? ?? 'gps+photo',
      verificationSource: json['verification_source'] as String? ?? 'gps',
      outcome: json['outcome'] as String? ?? 'COMPLETE',
      durationMin: json['duration_min'] != null
          ? (json['duration_min'] as num).toInt()
          : 0,
      stockCaptured: json['stock_captured'] as bool? ?? false,
      photoCount: json['photo_count'] as int? ?? 0,
      orderPlaced: json['order_placed'] as bool? ?? false,
      orderValue: json['order_value'] != null
          ? (json['order_value'] as num).toDouble()
          : null,
      notes: json['notes'] as String?,
      overrideReason: json['override_reason'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'outlet_id': outletId,
      'outlet_name': outletName,
      'retailer_id': retailerId,
      'rep_id': repId,
      'user_id': userId,
      'check_in_at': checkInAt.toIso8601String(),
      'check_out_at': checkOutAt?.toIso8601String(),
      'gps_lat': gpsLat,
      'gps_lng': gpsLng,
      'gps_accuracy': gpsAccuracy,
      'radius_m': radiusM,
      'gps_verified': gpsVerified,
      'verification_method': verificationMethod,
      'verification_source': verificationSource,
      'outcome': outcome,
      'duration_min': durationMin,
      'stock_captured': stockCaptured,
      'photo_count': photoCount,
      'order_placed': orderPlaced,
      'order_value': orderValue,
      'notes': notes,
      'override_reason': overrideReason,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }

  /// Check if visit is confirmed (GPS lock + photos verified)
  bool get isConfirmed => gpsVerified && verificationMethod == 'gps+photo';

  /// Get display string for verification status
  String get verificationStatus {
    if (gpsVerified && verificationMethod == 'gps+photo') {
      return 'Verified (GPS + Photos)';
    }
    if (gpsVerified && verificationMethod == 'gps') {
      return 'Verified (GPS only)';
    }
    if (verificationMethod == 'override') {
      return 'Override: $overrideReason';
    }
    return 'Pending';
  }
}