class OrderIntentModel {
  final String id;
  final String retailerId;
  final String repId;
  final String createdBy;
  final double total;
  final String forwardStatus;
  final DateTime? forwardedAt;
  final List<OrderIntentItemModel> items;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  OrderIntentModel({
    required this.id,
    required this.retailerId,
    required this.repId,
    required this.createdBy,
    this.total = 0,
    this.forwardStatus = 'pending',
    this.forwardedAt,
    this.items = const [],
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory OrderIntentModel.fromJson(Map<String, dynamic> json) {
    var itemsJson = json['items'] as List?;
    return OrderIntentModel(
      id: json['id'] as String,
      retailerId: json['retailer_id'] as String,
      repId: json['rep_id'] as String,
      createdBy: json['created_by'] as String,
      total: json['total'] != null ? (json['total'] as num).toDouble() : 0,
      forwardStatus: json['forward_status'] as String? ?? 'pending',
      forwardedAt: json['forwarded_at'] != null
          ? DateTime.parse(json['forwarded_at'] as String)
          : null,
      items: itemsJson != null
          ? itemsJson.map((x) => OrderIntentItemModel.fromJson(x)).toList()
          : [],
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
      'created_by': createdBy,
      'total': total,
      'forward_status': forwardStatus,
      'forwarded_at': forwardedAt?.toIso8601String(),
      'items': items.map((x) => x.toJson()).toList(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}

class OrderIntentItemModel {
  final String id;
  final String orderIntentId;
  final String sku;
  final String name;
  final int quantity;
  final double price;
  final DateTime createdAt;

  OrderIntentItemModel({
    required this.id,
    required this.orderIntentId,
    required this.sku,
    this.name = '',
    this.quantity = 1,
    this.price = 0,
    required this.createdAt,
  });

  factory OrderIntentItemModel.fromJson(Map<String, dynamic> json) {
    return OrderIntentItemModel(
      id: json['id'] as String,
      orderIntentId: json['order_intent_id'] as String,
      sku: json['sku'] as String,
      name: json['name'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 1,
      price: json['price'] != null ? (json['price'] as num).toDouble() : 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_intent_id': orderIntentId,
      'sku': sku,
      'name': name,
      'quantity': quantity,
      'price': price,
      'created_at': createdAt.toIso8601String(),
    };
  }
}