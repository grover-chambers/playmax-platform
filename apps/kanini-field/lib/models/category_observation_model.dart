/// CATEGORY & BRAND PRESENCE — §4.4.
///
/// Asked for every relevant category on every visit. `brandsPresent` is a
/// multi-select and `otherBrands` captures free text beyond the known list
/// (flour and dairy have curated lists; other categories are free text).
class CategoryObservationModel {
  final String id;
  final String visitId;
  final String outletId;
  final String repId;
  final String categoryCode;

  final bool stockedNow;
  final List<String> brandsPresent;
  final String? otherBrands;
  final List<String> packSizesPresent;
  final int shelfFacings;
  final double? priceObserved;
  final int? stockUnitsOnHand;
  final bool stockoutLast7Days;
  final String? fastestMovingBrand;
  final String? whyFastestCode;

  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  const CategoryObservationModel({
    required this.id,
    required this.visitId,
    required this.outletId,
    required this.repId,
    required this.categoryCode,
    this.stockedNow = false,
    this.brandsPresent = const [],
    this.otherBrands,
    this.packSizesPresent = const [],
    this.shelfFacings = 0,
    this.priceObserved,
    this.stockUnitsOnHand,
    this.stockoutLast7Days = false,
    this.fastestMovingBrand,
    this.whyFastestCode,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory CategoryObservationModel.fromJson(Map<String, dynamic> json) {
    return CategoryObservationModel(
      id: json['id'] as String,
      visitId: json['visit_id'] as String,
      outletId: json['outlet_id'] as String,
      repId: json['rep_id'] as String,
      categoryCode: json['category'] as String,
      stockedNow: json['stocked_now'] as bool? ?? false,
      brandsPresent: _stringList(json['brands_present']),
      otherBrands: json['other_brands'] as String?,
      packSizesPresent: _stringList(json['pack_sizes_present']),
      shelfFacings: json['shelf_facings'] as int? ?? 0,
      priceObserved: json['price_observed'] != null
          ? (json['price_observed'] as num).toDouble()
          : null,
      stockUnitsOnHand: json['stock_units_on_hand'] as int?,
      stockoutLast7Days: json['stockout_last_7_days'] as bool? ?? false,
      fastestMovingBrand: json['fastest_moving_brand'] as String?,
      whyFastestCode: json['why_fastest'] as String?,
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
      'outlet_id': outletId,
      'rep_id': repId,
      'category': categoryCode,
      'stocked_now': stockedNow,
      'brands_present': brandsPresent,
      'other_brands': otherBrands,
      'pack_sizes_present': packSizesPresent,
      'shelf_facings': shelfFacings,
      'price_observed': priceObserved,
      'stock_units_on_hand': stockUnitsOnHand,
      'stockout_last_7_days': stockoutLast7Days,
      'fastest_moving_brand': fastestMovingBrand,
      'why_fastest': whyFastestCode,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }

  static List<String> _stringList(dynamic v) {
    if (v is List) return v.map((e) => e.toString()).toList();
    if (v is String && v.isNotEmpty) return v.split(',');
    return const [];
  }
}
