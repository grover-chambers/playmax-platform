import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../domain/typology.dart';
import '../models/category_observation_model.dart';
import '../models/consent_record_model.dart';
import '../models/outlet_client_link_model.dart';
import '../models/outlet_contact_model.dart';
import '../models/outlet_model.dart';
import '../models/visit_model.dart';
import 'location_service.dart';
import 'quality_service.dart';
import 'sync_service.dart';

/// A census submission rejected by a hard quality gate. The UI shows the
/// [flags] so the enumerator knows exactly what to fix.
class CensusRejectedException implements Exception {
  final List<QualityFlag> flags;
  final String message;
  const CensusRejectedException(this.flags, this.message);

  @override
  String toString() => message;
}

/// Editable category observation (§4.4) — ids are assigned at submit time.
class CategoryDraft {
  ProductCategory category;
  bool stockedNow = true;
  List<String> brandsPresent = const [];
  String? otherBrands;
  List<String> packSizesPresent = const [];
  int shelfFacings = 0;
  double? priceObserved;
  int? stockUnitsOnHand;
  bool stockoutLast7Days = false;
  String? fastestMovingBrand;
  FastestMovingReason? whyFastest;

  CategoryDraft(this.category);
}

/// Mutable draft bundle built by the census flow UI and submitted atomically.
class CensusDraft {
  // GPS tier P1
  Position? gpsRaw; String accuracyTier='high'; String source='census_gps'; String? wardAuto; String? wardFinal; bool snapped=false; double? distanceM; double? gpsFinalLat; double? gpsFinalLng;
  // 4.1 Identity & location
  String businessName = '';
  Channel? channel;
  OutletType? outletType;
  String county = '';
  String constituency = '';
  String ward = '';
  String beat = '';
  String? street;
  String? landmark;
  String? buildingOrStallNo;
  List<String> operatingDays = const [];
  String? openingHours;
  int? yearEstablished;
  String? businessPermitNo;
  String? tillPaybillNo;

  // 4.1 GPS + photo (required)
  Position? gpsFix;
  String? storefrontPhotoPath;

  // 4.3 Contact (PD, minimised)
  String? contactName;
  ContactRole? contactRole;
  String? contactPhone;
  String? preferredLanguage;
  bool isDecisionMaker = false;

  // 3.3 Status per client
  final Map<String, String> clientStatuses = {};

  // 4.2 Commercial profile
  OutletSizeTier? sizeTier;
  double? shelfFacingMetres;
  int? staffCount;
  String? estDailyCustomers;
  bool hasFridge = false;
  bool hasFreezer = false;
  StorageCapacity? storageCapacity;
  bool sellsOnCredit = false;
  bool acceptsMpesa = false;
  PurchaseFrequency? purchaseFrequency;
  PrimarySupplySource? primarySupplySource;
  String? supplierName;
  String? distanceToSupplier;
  DeliveryMode? deliveryOrCollect;

  // 4.7 Extension (HoReCa / Institutional)
  InstitutionExtension? extension;

  // 4.4 Category & brand observations
  final List<CategoryDraft> categoryDrafts = [];

  // Consent
  bool consentAgreed = false;
  bool consentReuseAgreed = false;
  String consentScriptVersion = 'v1.0';

  Map<String, dynamic> toJson() => {
        'businessName': businessName,
        'channel': channel?.code,
        'outletType': outletType?.code,
        'county': county,
        'constituency': constituency,
        'ward': ward,
        'beat': beat,
        'street': street,
        'landmark': landmark,
        'buildingOrStallNo': buildingOrStallNo,
        'operatingDays': operatingDays,
        'openingHours': openingHours,
        'storefrontPhotoPath': storefrontPhotoPath,
        'gpsLat': gpsFix?.latitude,
        'gpsLng': gpsFix?.longitude,
        'gpsAccuracy': gpsFix?.accuracy,
        'gpsRawLat': gpsRaw?.latitude,
        'gpsRawLng': gpsRaw?.longitude,
        'gpsRawAccuracy': gpsRaw?.accuracy,
        'gpsFinalLat': gpsFinalLat,
        'gpsFinalLng': gpsFinalLng,
        'accuracyTier': accuracyTier,
        'source': source,
        'wardAuto': wardAuto,
        'wardFinal': wardFinal,
        'snapped': snapped,
        'distanceM': distanceM,
        'contactName': contactName,
        'contactRole': contactRole?.code,
        'contactPhone': contactPhone,
        'preferredLanguage': preferredLanguage,
        'isDecisionMaker': isDecisionMaker,
        'clientStatuses': Map<String, String>.from(clientStatuses),
        'categoryDrafts': categoryDrafts.map((c) => {
              'category': c.category.code,
              'stockedNow': c.stockedNow,
              'brandsPresent': c.brandsPresent,
              'otherBrands': c.otherBrands,
              'packSizesPresent': c.packSizesPresent,
              'shelfFacings': c.shelfFacings,
              'priceObserved': c.priceObserved,
              'stockUnitsOnHand': c.stockUnitsOnHand,
              'stockoutLast7Days': c.stockoutLast7Days,
              'fastestMovingBrand': c.fastestMovingBrand,
              'whyFastest': c.whyFastest?.code,
            }).toList(),
        'consentAgreed': consentAgreed,
        'consentReuseAgreed': consentReuseAgreed,
        'consentScriptVersion': consentScriptVersion,
      };

  static CensusDraft fromJson(Map<String, dynamic> j) {
    final d = CensusDraft()
      ..gpsRaw = _positionFrom(j, 'gpsRawLat', 'gpsRawLng', 'gpsRawAccuracy')
      ..gpsFix = _positionFrom(j, 'gpsLat', 'gpsLng', 'gpsAccuracy')
      ..gpsFinalLat = j['gpsFinalLat'] != null ? (j['gpsFinalLat'] as num).toDouble() : null
      ..gpsFinalLng = j['gpsFinalLng'] != null ? (j['gpsFinalLng'] as num).toDouble() : null
      ..accuracyTier = (j['accuracyTier'] as String?) ?? 'high'
      ..source = (j['source'] as String?) ?? 'census_gps'
      ..wardAuto = j['wardAuto'] as String?
      ..wardFinal = j['wardFinal'] as String?
      ..snapped = (j['snapped'] as bool?) ?? false
      ..distanceM = j['distanceM'] != null ? (j['distanceM'] as num).toDouble() : null
      ..businessName = (j['businessName'] as String?) ?? ''
      ..county = (j['county'] as String?) ?? ''
      ..constituency = (j['constituency'] as String?) ?? ''
      ..ward = (j['ward'] as String?) ?? ''
      ..beat = (j['beat'] as String?) ?? ''
      ..street = j['street'] as String?
      ..landmark = j['landmark'] as String?
      ..buildingOrStallNo = j['buildingOrStallNo'] as String?
      ..operatingDays = List<String>.from((j['operatingDays'] as List?) ?? [])
      ..openingHours = j['openingHours'] as String?
      ..storefrontPhotoPath = j['storefrontPhotoPath'] as String?
      ..contactName = j['contactName'] as String?
      ..contactPhone = j['contactPhone'] as String?
      ..preferredLanguage = j['preferredLanguage'] as String?
      ..isDecisionMaker = (j['isDecisionMaker'] as bool?) ?? false
      ..consentAgreed = (j['consentAgreed'] as bool?) ?? false
      ..consentReuseAgreed = (j['consentReuseAgreed'] as bool?) ?? false
      ..consentScriptVersion = (j['consentScriptVersion'] as String?) ?? 'v1.0';
    final ch = j['channel'] as String?;
    if (ch != null) d.channel = Channel.values.where((c) => c.code == ch).firstOrNull;
    final ot = j['outletType'] as String?;
    if (ot != null) d.outletType = OutletType.values.where((c) => c.code == ot).firstOrNull;
    final cr = j['contactRole'] as String?;
    if (cr != null) d.contactRole = ContactRole.values.where((c) => c.code == cr).firstOrNull;
    final cs = j['clientStatuses'] as Map?;
    if (cs != null) cs.forEach((k, v) { if (k is String && v is String) d.clientStatuses[k] = v; });
    final cds = j['categoryDrafts'] as List?;
    if (cds != null) {
      for (final e in cds) {
        if (e is! Map) continue;
        final cat = ProductCategory.fromCode(e['category'] as String? ?? '');
        if (cat == null) continue;
        final cd = CategoryDraft(cat)
          ..stockedNow = (e['stockedNow'] as bool?) ?? true
          ..brandsPresent = List<String>.from((e['brandsPresent'] as List?) ?? [])
          ..otherBrands = e['otherBrands'] as String?
          ..packSizesPresent = List<String>.from((e['packSizesPresent'] as List?) ?? [])
          ..shelfFacings = (e['shelfFacings'] as int?) ?? 0
          ..priceObserved = (e['priceObserved'] as num?)?.toDouble()
          ..stockUnitsOnHand = e['stockUnitsOnHand'] as int?
          ..stockoutLast7Days = (e['stockoutLast7Days'] as bool?) ?? false
          ..fastestMovingBrand = e['fastestMovingBrand'] as String?;
        final wf = e['whyFastest'] as String?;
        if (wf != null) cd.whyFastest = FastestMovingReason.values.where((r) => r.code == wf).firstOrNull;
        d.categoryDrafts.add(cd);
      }
    }
    return d;
  }

  static Position? _positionFrom(Map<String, dynamic> j, String latK, String lngK, String accK) {
    final lat = j[latK];
    final lng = j[lngK];
    if (lat == null || lng == null) return null;
    return locationService.positionOf(
      (lat as num).toDouble(),
      (lng as num).toDouble(),
      accuracy: j[accK] != null ? (j[accK] as num).toDouble() : 0,
    );
  }
}

/// Result of an accepted census submission: the rows written plus any
/// advisory flags the supervisor should see (proximity etc.).
class CensusResult {
  final OutletModel outlet;
  final OutletContactModel contact;
  final List<CategoryObservationModel> categoryObservations;
  final List<QualityFlag> advisoryFlags;

  const CensusResult({
    required this.outlet,
    required this.contact,
    required this.categoryObservations,
    this.advisoryFlags = const [],
  });
}

/// CENSUS SERVICE — writes one outlet record + contact + client links +
/// category observations + consent as a single atomic, quality-gated batch.
/// Parents are queued before children so `sync-push` applies them in order.
class CensusService {
  CensusService._();

  static final CensusService instance = CensusService._();

  static const _uuid = Uuid();

  /// Submit a full census. Throws [CensusRejectedException] when a hard gate
  /// fails; returns the written rows otherwise.
  Future<CensusResult> submitCensus({
    required CensusDraft draft,
    required String repId,
    required String batchId,
  }) async {
    final now = DateTime.now().toUtc();
    final isManual = draft.source == 'census_manual_pin';
    final finalLat = draft.gpsFinalLat ?? draft.gpsFix?.latitude;
    final finalLng = draft.gpsFinalLng ?? draft.gpsFix?.longitude;
    if (finalLat == null || finalLng == null) {
      throw const CensusRejectedException([], 'No location captured — acquire GPS or drop a pin.');
    }
    // gps_lat/lng are written as the FINAL location (pin if dropped), so the
    // map and old builds stay correct; tier columns keep the provenance.
    final position = locationService.positionOf(finalLat, finalLng,
        accuracy: isManual ? 0 : (draft.gpsFix?.accuracy ?? 0), at: now);
    final raw = draft.gpsRaw ?? draft.gpsFix;

    // --- Gates ------------------------------------------------------------
    final hardFlags = <QualityFlag>[];
    // A dropped pin is the sanctioned fallback for a weak/no GPS lock — do not
    // reject it on accuracy; the supervisor review surfaces manual pins instead.
    if (!isManual) {
      final gpsGate = qualityService.gateGps(position.accuracy);
      if (gpsGate != null) hardFlags.add(gpsGate);
    }
    final oneVisit = qualityService.oneVisitRule(
        _draftOutletId(draft), DateTime.now());
    if (oneVisit != null) hardFlags.add(oneVisit);
    final photo = qualityService.photoMandatory(draft.storefrontPhotoPath != null);
    if (photo != null) hardFlags.add(photo);

    if (!draft.consentAgreed) {
      throw const CensusRejectedException(
          [], 'Consent is required before any data capture.');
    }
    if (hardFlags.isNotEmpty) {
      throw CensusRejectedException(hardFlags, _describe(hardFlags));
    }

    // --- Build rows -------------------------------------------------------
    final outletId = _uuid.v4();
    final consent = ConsentRecordModel(
      id: _uuid.v4(),
      scriptVersion: draft.consentScriptVersion,
      gpsLat: position.latitude,
      gpsLng: position.longitude,
      enumeratorId: repId,
      consentedAt: now,
      reuseAgreed: draft.consentReuseAgreed,
      updatedAt: now,
    );

    final outlet = OutletModel(
      id: outletId,
      businessName: draft.businessName.trim(),
      channelCode: draft.channel!.code,
      outletTypeCode: draft.outletType!.code,
      gpsLat: position.latitude,
      gpsLng: position.longitude,
      gpsAccuracyM: position.accuracy,
      gpsRawLat: raw?.latitude,
      gpsRawLng: raw?.longitude,
      gpsFinalLat: finalLat,
      gpsFinalLng: finalLng,
      accuracyM: isManual ? (draft.gpsFix?.accuracy ?? 0) : position.accuracy,
      accuracyTier: draft.accuracyTier,
      source: draft.source,
      wardAuto: draft.wardAuto,
      wardFinal: draft.wardFinal ?? draft.wardAuto ?? draft.ward,
      snapped: draft.snapped,
      distanceM: draft.distanceM,
      county: draft.county,
      constituency: draft.constituency,
      ward: draft.ward,
      beat: draft.beat,
      street: draft.street,
      landmark: draft.landmark,
      buildingOrStallNo: draft.buildingOrStallNo,
      storefrontPhotoPath: draft.storefrontPhotoPath,
      operatingDays: draft.operatingDays,
      openingHours: draft.openingHours,
      yearEstablished: draft.yearEstablished,
      businessPermitNo: draft.businessPermitNo,
      tillPaybillNo: draft.tillPaybillNo,
      sizeTierCode: draft.sizeTier?.code,
      shelfFacingMetres: draft.shelfFacingMetres,
      staffCount: draft.staffCount,
      estDailyCustomers: draft.estDailyCustomers,
      hasFridge: draft.hasFridge,
      hasFreezer: draft.hasFreezer,
      storageCapacityCode: draft.storageCapacity?.code,
      sellsOnCredit: draft.sellsOnCredit,
      acceptsMpesa: draft.acceptsMpesa,
      purchaseFrequencyCode: draft.purchaseFrequency?.code,
      primarySupplySourceCode: draft.primarySupplySource?.code,
      supplierName: draft.supplierName,
      distanceToSupplier: draft.distanceToSupplier,
      deliveryOrCollectCode: draft.deliveryOrCollect?.code,
      extension: draft.extension,
      batchId: batchId,
      createdBy: repId,
      createdAt: now,
      updatedAt: now,
    );

    final contact = OutletContactModel(
      id: _uuid.v4(),
      outletId: outletId,
      contactName: draft.contactName,
      roleCode: draft.contactRole?.code,
      phonePrimary: draft.contactPhone,
      preferredLanguage: draft.preferredLanguage,
      isDecisionMaker: draft.isDecisionMaker,
      consentId: consent.id,
      createdBy: repId,
      createdAt: now,
      updatedAt: now,
    );

    // --- Queue (parents before children) ---------------------------------
    await syncService.enqueueSync('consent_records', consent.id, consent.toJson());
    await syncService.enqueueSync('outlets', outletId, outlet.toJson());
    // The DB links every visit via visits.retailer_id → retailers(id). A
    // census-discovered shop is a brand-new retailer, so enqueue a matching
    // retailers row (same id) before the visit that references it.
    await syncService.enqueueSync('retailers', outletId, {
      'id': outletId,
      'name': draft.businessName.trim(),
      'ward': draft.wardFinal ?? draft.wardAuto ?? draft.ward,
      'constituency': draft.constituency,
      'ward_auto': draft.wardAuto,
      'lat': position.latitude,
      'lng': position.longitude,
      'rep_id': repId,
      'created_by': repId,
      'status': 'active',
      'created_at': now.toIso8601String(),
      'updated_at': now.toIso8601String(),
    });
    await syncService.enqueueSync('outlet_contacts', contact.id, contact.toJson());

    for (final entry in draft.clientStatuses.entries) {
      final link = OutletClientLinkModel(
        id: _uuid.v4(),
        outletId: outletId,
        clientId: entry.key,
        statusCode: entry.value,
        createdBy: repId,
        createdAt: now,
        updatedAt: now,
      );
      await syncService.enqueueSync('outlet_client_links', link.id, link.toJson());
    }

    final visit = Visit(
      id: _uuid.v4(),
      outletId: outletId,
      outletName: outlet.businessName,
      retailerId: outletId,
      repId: repId,
      userId: repId,
      checkInAt: now,
      gpsLat: position.latitude,
      gpsLng: position.longitude,
      gpsAccuracy: position.accuracy,
      gpsVerified: true,
      verificationMethod: isManual ? 'pin' : 'gps',
      verificationSource: isManual ? 'manual_pin' : 'gps',
      outcome: VisitOutcome.complete.code,
      stockCaptured: draft.categoryDrafts.isNotEmpty,
      photoCount: draft.storefrontPhotoPath != null ? 1 : 0,
      notes: 'census',
      batchId: batchId,
      createdAt: now,
      updatedAt: now,
    );
    await syncService.enqueueSync('visits', visit.id, visit.toJson());

    final observations = <CategoryObservationModel>[];
    for (final cd in draft.categoryDrafts) {
      final obs = CategoryObservationModel(
        id: _uuid.v4(),
        visitId: visit.id,
        outletId: outletId,
        repId: repId,
        categoryCode: cd.category.code,
        stockedNow: cd.stockedNow,
        brandsPresent: cd.brandsPresent,
        otherBrands: cd.otherBrands,
        packSizesPresent: cd.packSizesPresent,
        shelfFacings: cd.shelfFacings,
        priceObserved: cd.priceObserved,
        stockUnitsOnHand: cd.stockUnitsOnHand,
        stockoutLast7Days: cd.stockoutLast7Days,
        fastestMovingBrand: cd.fastestMovingBrand,
        whyFastestCode: cd.whyFastest?.code,
        batchId: batchId,
        createdBy: repId,
        createdAt: now,
        updatedAt: now,
      );
      observations.add(obs);
      await syncService.enqueueSync('category_observations', obs.id, obs.toJson());
    }

    await qualityService.recordCensusVisit(_draftOutletId(draft), repId);

    return CensusResult(
      outlet: outlet,
      contact: contact,
      categoryObservations: observations,
    );
  }

  String _draftOutletId(CensusDraft draft) =>
      '${draft.businessName.trim().toLowerCase()}:${draft.ward}:${draft.beat}';

  String _describe(List<QualityFlag> flags) {
    final reasons = flags.map((f) => f.label).join('; ');
    return 'Census rejected by quality gate: $reasons';
  }
}

final CensusService censusService = CensusService.instance;
