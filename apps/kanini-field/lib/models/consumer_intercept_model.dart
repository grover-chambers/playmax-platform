/// CONSUMER_INTERCEPT — §4.6 anonymous, always.
///
/// No identifiers at all: no name, no phone, no ID. Fields are demographic
/// bands and brand-awareness questions. `unaidedBrandsAware` MUST be captured
/// before `aidedBrandsAware` — enforced by the survey sequence lock, not by
/// training.
class ConsumerInterceptModel {
  final String id;
  final String ward;
  final String channelContextCode;

  final String? householdSizeBand;
  final String? shopperRoleCode;
  final List<String> categoriesBoughtWeekly;

  // Order matters: unaided captured before any brand list appears.
  final List<String> unaidedBrandsAware;
  final List<String> aidedBrandsAware;

  final String? flourBrandUsedNow;
  final String? milkBrandUsedNow;
  final String? packSizePreferred;
  final String? purchaseFrequencyCode;
  final String? whereTheyBuyCode;
  final double? pricePaidLast;
  final String? switchTriggerCode;
  final double? maxAcceptablePrice;
  final String? wouldTryNewBrandCode;

  final String consentId;
  final String enumeratorId;
  final DateTime capturedAt;
  final DateTime updatedAt;

  const ConsumerInterceptModel({
    required this.id,
    required this.ward,
    required this.channelContextCode,
    this.householdSizeBand,
    this.shopperRoleCode,
    this.categoriesBoughtWeekly = const [],
    this.unaidedBrandsAware = const [],
    this.aidedBrandsAware = const [],
    this.flourBrandUsedNow,
    this.milkBrandUsedNow,
    this.packSizePreferred,
    this.purchaseFrequencyCode,
    this.whereTheyBuyCode,
    this.pricePaidLast,
    this.switchTriggerCode,
    this.maxAcceptablePrice,
    this.wouldTryNewBrandCode,
    required this.consentId,
    required this.enumeratorId,
    required this.capturedAt,
    required this.updatedAt,
  });

  factory ConsumerInterceptModel.fromJson(Map<String, dynamic> json) {
    List<String> l(dynamic v) {
      if (v is List) return v.map((e) => e.toString()).toList();
      return const [];
    }

    return ConsumerInterceptModel(
      id: json['id'] as String,
      ward: json['ward'] as String? ?? '',
      channelContextCode: json['channel_context'] as String? ?? '',
      householdSizeBand: json['household_size_band'] as String?,
      shopperRoleCode: json['shopper_role'] as String?,
      categoriesBoughtWeekly: l(json['categories_bought_weekly']),
      unaidedBrandsAware: l(json['unaided_brands_aware']),
      aidedBrandsAware: l(json['aided_brands_aware']),
      flourBrandUsedNow: json['flour_brand_used_now'] as String?,
      milkBrandUsedNow: json['milk_brand_used_now'] as String?,
      packSizePreferred: json['pack_size_preferred'] as String?,
      purchaseFrequencyCode: json['purchase_frequency'] as String?,
      whereTheyBuyCode: json['where_they_buy'] as String?,
      pricePaidLast: json['price_paid_last'] != null
          ? (json['price_paid_last'] as num).toDouble()
          : null,
      switchTriggerCode: json['switch_trigger'] as String?,
      maxAcceptablePrice: json['max_acceptable_price'] != null
          ? (json['max_acceptable_price'] as num).toDouble()
          : null,
      wouldTryNewBrandCode: json['would_try_new_brand'] as String?,
      consentId: json['consent_id'] as String? ?? '',
      enumeratorId: json['enumerator_id'] as String? ?? '',
      capturedAt: json['captured_at'] != null
          ? DateTime.parse(json['captured_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ward': ward,
      'channel_context': channelContextCode,
      'household_size_band': householdSizeBand,
      'shopper_role': shopperRoleCode,
      'categories_bought_weekly': categoriesBoughtWeekly,
      'unaided_brands_aware': unaidedBrandsAware,
      'aided_brands_aware': aidedBrandsAware,
      'flour_brand_used_now': flourBrandUsedNow,
      'milk_brand_used_now': milkBrandUsedNow,
      'pack_size_preferred': packSizePreferred,
      'purchase_frequency': purchaseFrequencyCode,
      'where_they_buy': whereTheyBuyCode,
      'price_paid_last': pricePaidLast,
      'switch_trigger': switchTriggerCode,
      'max_acceptable_price': maxAcceptablePrice,
      'would_try_new_brand': wouldTryNewBrandCode,
      'consent_id': consentId,
      'enumerator_id': enumeratorId,
      'captured_at': capturedAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
