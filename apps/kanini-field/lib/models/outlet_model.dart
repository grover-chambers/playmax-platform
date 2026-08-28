import '../domain/typology.dart';

/// 4.1 + 4.2 + 4.7 OUTLET — canonical, shared Market Reference Data.
///
/// One outlet record serves every client (§2): identity/location (§4.1),
/// commercial profile (§4.2) and — when [Channel.horeca] or
/// [Channel.institutional] — the extension block (§4.7). What is NOT here is
/// client relationship: that lives on [OutletClientLinkModel].
///
/// Row ownership and statuses are per-client and never land on this record.
class OutletModel {
  final String id;
  final String businessName;
  final String channelCode;
  final String outletTypeCode;

  final double gpsLat;
  final double gpsLng;
  final double? gpsAccuracyM;

  final String county;
  final String constituency;
  final String ward;
  final String beat;
  final String? street;
  final String? landmark;
  final String? buildingOrStallNo;
  final String? storefrontPhotoPath;

  final List<String> operatingDays;
  final String? openingHours;
  final int? yearEstablished;
  final String? businessPermitNo;
  final String? tillPaybillNo;

  // 4.2 Commercial profile
  final String? sizeTierCode;
  final double? shelfFacingMetres;
  final int? staffCount;
  final String? estDailyCustomers;
  final bool hasFridge;
  final bool hasFreezer;
  final String? storageCapacityCode;
  final bool sellsOnCredit;
  final bool acceptsMpesa;
  final String? purchaseFrequencyCode;
  final String? primarySupplySourceCode;
  final String? supplierName;
  final String? distanceToSupplier;
  final String? deliveryOrCollectCode;

  // 4.7 HoReCa / Institutional extension (embedded)
  final InstitutionExtension? extension;

  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  const OutletModel({
    required this.id,
    required this.businessName,
    required this.channelCode,
    required this.outletTypeCode,
    required this.gpsLat,
    required this.gpsLng,
    this.gpsAccuracyM,
    this.county = '',
    this.constituency = '',
    this.ward = '',
    this.beat = '',
    this.street,
    this.landmark,
    this.buildingOrStallNo,
    this.storefrontPhotoPath,
    this.operatingDays = const [],
    this.openingHours,
    this.yearEstablished,
    this.businessPermitNo,
    this.tillPaybillNo,
    this.sizeTierCode,
    this.shelfFacingMetres,
    this.staffCount,
    this.estDailyCustomers,
    this.hasFridge = false,
    this.hasFreezer = false,
    this.storageCapacityCode,
    this.sellsOnCredit = false,
    this.acceptsMpesa = false,
    this.purchaseFrequencyCode,
    this.primarySupplySourceCode,
    this.supplierName,
    this.distanceToSupplier,
    this.deliveryOrCollectCode,
    this.extension,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  Channel get channel =>
      Channel.fromCode(channelCode) ?? Channel.traditionalTrade;
  OutletType get outletType =>
      OutletType.fromCode(outletTypeCode) ?? OutletType.other;

  factory OutletModel.fromJson(Map<String, dynamic> json) {
    return OutletModel(
      id: json['id'] as String,
      businessName: json['business_name'] as String,
      channelCode: json['channel'] as String,
      outletTypeCode: json['outlet_type'] as String,
      gpsLat: (json['gps_lat'] as num).toDouble(),
      gpsLng: (json['gps_lng'] as num).toDouble(),
      gpsAccuracyM:
          json['gps_accuracy_m'] != null ? (json['gps_accuracy_m'] as num).toDouble() : null,
      county: json['county'] as String? ?? '',
      constituency: json['constituency'] as String? ?? '',
      ward: json['ward'] as String? ?? '',
      beat: json['beat'] as String? ?? '',
      street: json['street'] as String?,
      landmark: json['landmark'] as String?,
      buildingOrStallNo: json['building_or_stall_no'] as String?,
      storefrontPhotoPath: json['storefront_photo_path'] as String?,
      operatingDays: _stringList(json['operating_days']),
      openingHours: json['opening_hours'] as String?,
      yearEstablished: json['year_established'] as int?,
      businessPermitNo: json['business_permit_no'] as String?,
      tillPaybillNo: json['till_paybill_no'] as String?,
      sizeTierCode: json['size_tier'] as String?,
      shelfFacingMetres:
          json['shelf_facing_metres'] != null ? (json['shelf_facing_metres'] as num).toDouble() : null,
      staffCount: json['staff_count'] as int?,
      estDailyCustomers: json['est_daily_customers'] as String?,
      hasFridge: json['has_fridge'] as bool? ?? false,
      hasFreezer: json['has_freezer'] as bool? ?? false,
      storageCapacityCode: json['storage_capacity'] as String?,
      sellsOnCredit: json['sells_on_credit'] as bool? ?? false,
      acceptsMpesa: json['accepts_mpesa'] as bool? ?? false,
      purchaseFrequencyCode: json['purchase_frequency'] as String?,
      primarySupplySourceCode: json['primary_supply_source'] as String?,
      supplierName: json['supplier_name'] as String?,
      distanceToSupplier: json['distance_to_supplier'] as String?,
      deliveryOrCollectCode: json['delivery_or_collect'] as String?,
      extension: json['extension'] != null
          ? InstitutionExtension.fromJson(Map<String, dynamic>.from(json['extension'] as Map))
          : null,
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
      'business_name': businessName,
      'channel': channelCode,
      'outlet_type': outletTypeCode,
      'gps_lat': gpsLat,
      'gps_lng': gpsLng,
      'gps_accuracy_m': gpsAccuracyM,
      'county': county,
      'constituency': constituency,
      'ward': ward,
      'beat': beat,
      'street': street,
      'landmark': landmark,
      'building_or_stall_no': buildingOrStallNo,
      'storefront_photo_path': storefrontPhotoPath,
      'operating_days': operatingDays,
      'opening_hours': openingHours,
      'year_established': yearEstablished,
      'business_permit_no': businessPermitNo,
      'till_paybill_no': tillPaybillNo,
      'size_tier': sizeTierCode,
      'shelf_facing_metres': shelfFacingMetres,
      'staff_count': staffCount,
      'est_daily_customers': estDailyCustomers,
      'has_fridge': hasFridge,
      'has_freezer': hasFreezer,
      'storage_capacity': storageCapacityCode,
      'sells_on_credit': sellsOnCredit,
      'accepts_mpesa': acceptsMpesa,
      'purchase_frequency': purchaseFrequencyCode,
      'primary_supply_source': primarySupplySourceCode,
      'supplier_name': supplierName,
      'distance_to_supplier': distanceToSupplier,
      'delivery_or_collect': deliveryOrCollectCode,
      'extension': extension?.toJson(),
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }

  OutletModel copyWith({String? storefrontPhotoPath}) {
    return OutletModel(
      id: id,
      businessName: businessName,
      channelCode: channelCode,
      outletTypeCode: outletTypeCode,
      gpsLat: gpsLat,
      gpsLng: gpsLng,
      gpsAccuracyM: gpsAccuracyM,
      county: county,
      constituency: constituency,
      ward: ward,
      beat: beat,
      street: street,
      landmark: landmark,
      buildingOrStallNo: buildingOrStallNo,
      storefrontPhotoPath: storefrontPhotoPath ?? this.storefrontPhotoPath,
      operatingDays: operatingDays,
      openingHours: openingHours,
      yearEstablished: yearEstablished,
      businessPermitNo: businessPermitNo,
      tillPaybillNo: tillPaybillNo,
      sizeTierCode: sizeTierCode,
      shelfFacingMetres: shelfFacingMetres,
      staffCount: staffCount,
      estDailyCustomers: estDailyCustomers,
      hasFridge: hasFridge,
      hasFreezer: hasFreezer,
      storageCapacityCode: storageCapacityCode,
      sellsOnCredit: sellsOnCredit,
      acceptsMpesa: acceptsMpesa,
      purchaseFrequencyCode: purchaseFrequencyCode,
      primarySupplySourceCode: primarySupplySourceCode,
      supplierName: supplierName,
      distanceToSupplier: distanceToSupplier,
      deliveryOrCollectCode: deliveryOrCollectCode,
      extension: extension,
      createdBy: createdBy,
      createdAt: createdAt,
      updatedAt: updatedAt,
      deletedAt: deletedAt,
    );
  }

  static List<String> _stringList(dynamic v) {
    if (v is List) return v.map((e) => e.toString()).toList();
    if (v is String && v.isNotEmpty) return v.split(',');
    return const [];
  }
}

/// 4.7 Extension block — shown only when channel = HoReCa or Institutional.
class InstitutionExtension {
  final int? seats;
  final int? coversPerDay;
  final String? mealsServedDaily;
  final double? flourKgPerWeek;
  final double? milkLitresPerDay;
  final List<String> menuItemsUsingCategory;
  final String? purchaseChannelCode;
  final String? decisionMakerRoleCode;
  final String? contractOrSpotBuying;
  final String? paymentTermsCode;

  const InstitutionExtension({
    this.seats,
    this.coversPerDay,
    this.mealsServedDaily,
    this.flourKgPerWeek,
    this.milkLitresPerDay,
    this.menuItemsUsingCategory = const [],
    this.purchaseChannelCode,
    this.decisionMakerRoleCode,
    this.contractOrSpotBuying,
    this.paymentTermsCode,
  });

  factory InstitutionExtension.fromJson(Map<String, dynamic> json) {
    return InstitutionExtension(
      seats: json['seats'] as int?,
      coversPerDay: json['covers_per_day'] as int?,
      mealsServedDaily: json['meals_served_daily'] as String?,
      flourKgPerWeek: json['flour_kg_per_week'] != null
          ? (json['flour_kg_per_week'] as num).toDouble()
          : null,
      milkLitresPerDay: json['milk_litres_per_day'] != null
          ? (json['milk_litres_per_day'] as num).toDouble()
          : null,
      menuItemsUsingCategory: OutletModel._stringList(json['menu_items_using_category']),
      purchaseChannelCode: json['purchase_channel'] as String?,
      decisionMakerRoleCode: json['decision_maker_role'] as String?,
      contractOrSpotBuying: json['contract_or_spot_buying'] as String?,
      paymentTermsCode: json['payment_terms'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'seats': seats,
      'covers_per_day': coversPerDay,
      'meals_served_daily': mealsServedDaily,
      'flour_kg_per_week': flourKgPerWeek,
      'milk_litres_per_day': milkLitresPerDay,
      'menu_items_using_category': menuItemsUsingCategory,
      'purchase_channel': purchaseChannelCode,
      'decision_maker_role': decisionMakerRoleCode,
      'contract_or_spot_buying': contractOrSpotBuying,
      'payment_terms': paymentTermsCode,
    };
  }
}
