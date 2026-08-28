class ShelfPhoto {
  final String id;
  final String visitId;
  final String retailerId;
  final String repId;
  final String filePath;
  final String photoType; // 'shop_front' | 'shelf'
  final String lat; // stored as string from EXIF or manual entry
  final String lng; // stored as string from EXIF or manual entry
  final double? accuracy;
  final DateTime capturedAt;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  ShelfPhoto({
    required this.id,
    required this.visitId,
    required this.retailerId,
    required this.repId,
    required this.filePath,
    this.photoType = 'shop_front',
    this.lat = '',
    this.lng = '',
    this.accuracy,
    required this.capturedAt,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory ShelfPhoto.fromJson(Map<String, dynamic> json) {
    return ShelfPhoto(
      id: json['id'] as String,
      visitId: json['visit_id'] as String,
      retailerId: json['retailer_id'] as String,
      repId: json['rep_id'] as String,
      filePath: json['file_path'] as String,
      photoType: json['photo_type'] as String? ?? 'shop_front',
      lat: json['lat'] as String? ?? '',
      lng: json['lng'] as String? ?? '',
      accuracy: json['accuracy'] != null ? (json['accuracy'] as num).toDouble() : null,
      capturedAt: json['captured_at'] != null
          ? DateTime.parse(json['captured_at'] as String)
          : DateTime.now(),
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
      'visit_id': visitId,
      'retailer_id': retailerId,
      'rep_id': repId,
      'file_path': filePath,
      'photo_type': photoType,
      'lat': lat,
      'lng': lng,
      'accuracy': accuracy,
      'captured_at': capturedAt.toIso8601String(),
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}