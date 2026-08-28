import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../models/consent_record_model.dart';
import '../models/consumer_intercept_model.dart';
import 'quality_service.dart';
import 'sequence_lock.dart';
import 'sync_service.dart';

/// An intercept rejected before capture — always a sequence-lock or consent
/// problem, never a data-quality one (the intercept is anonymous and fast).
class InterceptRejectedException implements Exception {
  final String message;
  const InterceptRejectedException(this.message);

  @override
  String toString() => message;
}

/// Mutable draft for one anonymous consumer intercept (§4.6).
class InterceptDraft {
  String ward = '';
  String channelContextCode = 'traditional'; // Channel code where intercepted
  String? householdSizeBand;
  String? shopperRoleCode;
  List<String> categoriesBoughtWeekly = const [];

  String? flourBrandUsedNow;
  String? milkBrandUsedNow;
  String? packSizePreferred;
  String? purchaseFrequencyCode;
  String? whereTheyBuyCode;
  double? pricePaidLast;
  String? switchTriggerCode;
  double? maxAcceptablePrice;
  String? wouldTryNewBrandCode;

  Position? gpsFix;
  bool consentAgreed = false;
  String consentScriptVersion = 'v1.0';
}

/// INTERCEPT SERVICE — §4.6. Writes an anonymous [ConsumerInterceptModel]
/// plus its [ConsentRecordModel] through [SurveySequenceLock]. The lock is
/// enforced at save time, not by training: the UI hands in a lock that has
/// already recorded unaided-then-aided ordering.
class InterceptService {
  InterceptService._();

  static final InterceptService instance = InterceptService._();

  static const _uuid = Uuid();

  /// Submit one intercept. [lock] must pass [SurveySequenceLock.check].
  Future<ConsumerInterceptModel> submitIntercept({
    required InterceptDraft draft,
    required SurveySequenceLock lock,
    required String repId,
  }) async {
    final now = DateTime.now().toUtc();
    final position = draft.gpsFix;

    if (!draft.consentAgreed) {
      throw const InterceptRejectedException(
          'Consent is required before any intercept.');
    }
    if (qualityService.gateGps(position?.accuracy) != null) {
      throw const InterceptRejectedException(
          'GPS accuracy is too poor for a valid intercept (needs ≤ 15 m).');
    }

    // §4.6 The unaided list is meaningless if the aided list was shown first.
    try {
      lock.check();
    } on SequenceLockViolation catch (e) {
      throw InterceptRejectedException(e.message);
    }

    final consent = ConsentRecordModel(
      id: _uuid.v4(),
      scriptVersion: draft.consentScriptVersion,
      gpsLat: position!.latitude,
      gpsLng: position.longitude,
      enumeratorId: repId,
      consentedAt: now,
      reuseAgreed: true,
      updatedAt: now,
    );

    final intercept = ConsumerInterceptModel(
      id: _uuid.v4(),
      ward: draft.ward,
      channelContextCode: draft.channelContextCode,
      householdSizeBand: draft.householdSizeBand,
      shopperRoleCode: draft.shopperRoleCode,
      categoriesBoughtWeekly: draft.categoriesBoughtWeekly,
      unaidedBrandsAware: lock.unaided,
      aidedBrandsAware: lock.aided,
      flourBrandUsedNow: draft.flourBrandUsedNow,
      milkBrandUsedNow: draft.milkBrandUsedNow,
      packSizePreferred: draft.packSizePreferred,
      purchaseFrequencyCode: draft.purchaseFrequencyCode,
      whereTheyBuyCode: draft.whereTheyBuyCode,
      pricePaidLast: draft.pricePaidLast,
      switchTriggerCode: draft.switchTriggerCode,
      maxAcceptablePrice: draft.maxAcceptablePrice,
      wouldTryNewBrandCode: draft.wouldTryNewBrandCode,
      consentId: consent.id,
      enumeratorId: repId,
      capturedAt: now,
      updatedAt: now,
    );

    await syncService.enqueueSync('consent_records', consent.id, consent.toJson());
    await syncService.enqueueSync('consumer_intercepts', intercept.id, intercept.toJson());

    return intercept;
  }
}

final InterceptService interceptService = InterceptService.instance;
