class CompetitorObservationModel {
  final String id;
  final String retailerId;
  final String repId;
  final String visitId;
  final String brand;
  final String productName;
  final double price;
  final String shelfPresence; // 'full_facing' | 'half_facing' | 'shelf_edge' | 'none'
  final String activity; // 'promo' | 'price-drop' | 'new-listing' | 'stockout' | 'shelf-share'
  final bool promotionActive;
  final String note;
  final DateTime at;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  CompetitorObservationModel({
    required this.id,
    required this.retailerId,
    required this.repId,
    required this.visitId,
    required this.brand,
    this.productName = '',
    this.price = 0,
    this.shelfPresence = 'none',
    required this.activity,
    this.promotionActive = false,
    this.note = '',
    required this.at,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory CompetitorObservationModel.fromJson(Map<String, dynamic> json) {
    return CompetitorObservationModel(
      id: json['id'] as String,
      retailerId: json['retailer_id'] as String,
      repId: json['rep_id'] as String,
      visitId: json['visit_id'] as String,
      brand: json['brand'] as String,
      productName: json['product_name'] as String? ?? '',
      price: json['price'] != null ? (json['price'] as num).toDouble() : 0,
      shelfPresence: json['shelf_presence'] as String? ?? 'none',
      activity: json['activity'] as String? ?? 'promo',
      promotionActive: json['promotion_active'] as bool? ?? false,
      note: json['note'] as String? ?? '',
      at: json['at'] != null ? DateTime.parse(json['at'] as String) : DateTime.now(),
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
      'retailer_id': retailerId,
      'rep_id': repId,
      'visit_id': visitId,
      'brand': brand,
      'product_name': productName,
      'price': price,
      'shelf_presence': shelfPresence,
      'activity': activity,
      'promotion_active': promotionActive,
      'note': note,
      'at': at.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}