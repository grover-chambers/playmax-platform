class StockObservationModel {
  final String id;
  final String visitId;
  final String retailerId;
  final String repId;
  final String sku;
  final String name;
  final int qty;
  final String shelf;
  final double price;
  final DateTime capturedAt;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  StockObservationModel({
    required this.id,
    required this.visitId,
    required this.retailerId,
    required this.repId,
    required this.sku,
    this.name = '',
    this.qty = 0,
    this.shelf = 'full',
    this.price = 0,
    required this.capturedAt,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory StockObservationModel.fromJson(Map<String, dynamic> json) {
    return StockObservationModel(
      id: json['id'] as String,
      visitId: json['visit_id'] as String,
      retailerId: json['retailer_id'] as String,
      repId: json['rep_id'] as String,
      sku: json['sku'] as String,
      name: json['name'] as String? ?? '',
      qty: json['qty'] as int? ?? 0,
      shelf: json['shelf'] as String? ?? 'full',
      price: json['price'] != null ? (json['price'] as num).toDouble() : 0,
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
      'sku': sku,
      'name': name,
      'qty': qty,
      'shelf': shelf,
      'price': price,
      'captured_at': capturedAt.toIso8601String(),
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}