import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../domain/typology.dart';
import '../models/category_observation_model.dart';
import '../models/consent_record_model.dart';
import '../models/outlet_client_link_model.dart';
import '../models/outlet_contact_model.dart';
import '../models/outlet_model.dart';
import '../models/visit_model.dart';
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
  }) async {
    final now = DateTime.now().toUtc();
    final position = draft.gpsFix;

    // --- Gates ------------------------------------------------------------
    final hardFlags = <QualityFlag>[];
    final gpsGate = qualityService.gateGps(position?.accuracy);
    if (gpsGate != null) hardFlags.add(gpsGate);
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
      gpsLat: position!.latitude,
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
      verificationMethod: 'gps',
      verificationSource: 'gps',
      outcome: VisitOutcome.complete.code,
      stockCaptured: draft.categoryDrafts.isNotEmpty,
      photoCount: draft.storefrontPhotoPath != null ? 1 : 0,
      notes: 'census',
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
