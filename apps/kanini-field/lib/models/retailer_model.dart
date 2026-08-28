class Retailer {
  final String id;
  final String name;
  final String? ownerName;
  final String? phone;
  final double latitude;
  final double longitude;
  final String? businessType;
  final String? businessSize;
  final String tier;
  final String status;
  final String ward;
  final String constituency;
  final String zone;
  final String address;
  final double competitorPresence; // 0-100
  final String? shelfNote;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  Retailer({
    required this.id,
    required this.name,
    this.ownerName,
    this.phone,
    required this.latitude,
    required this.longitude,
    this.businessType,
    this.businessSize,
    required this.tier,
    required this.status,
    required this.ward,
    required this.constituency,
    required this.zone,
    required this.address,
    this.competitorPresence = 0,
    this.shelfNote,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory Retailer.fromJson(Map<String, dynamic> json) {
    return Retailer(
      id: json['id'] as String,
      name: json['name'] as String,
      ownerName: json['owner_name'] as String?,
      phone: json['phone'] as String?,
      latitude: (json['lat'] as num).toDouble(),
      longitude: (json['lng'] as num).toDouble(),
      businessType: json['business_type'] as String?,
      businessSize: json['business_size'] as String?,
      tier: json['tier'] as String? ?? 'B',
      status: json['status'] as String? ?? 'active',
      ward: json['ward'] as String? ?? '',
      constituency: json['constituency'] as String? ?? '',
      zone: json['zone'] as String? ?? 'Central',
      address: json['address'] as String? ?? '',
      competitorPresence: json['competitor_presence'] != null
          ? (json['competitor_presence'] as num).toDouble()
          : 0,
      shelfNote: json['shelf_note'] as String?,
      createdBy: json['created_by'] as String?,
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
      'name': name,
      'owner_name': ownerName,
      'phone': phone,
      'lat': latitude,
      'lng': longitude,
      'business_type': businessType,
      'business_size': businessSize,
      'tier': tier,
      'status': status,
      'ward': ward,
      'constituency': constituency,
      'zone': zone,
      'address': address,
      'competitor_presence': competitorPresence,
      'shelf_note': shelfNote,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}