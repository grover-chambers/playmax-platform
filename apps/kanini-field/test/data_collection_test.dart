import 'package:flutter_test/flutter_test.dart';

import 'package:niceos_app/domain/typology.dart';
import 'package:niceos_app/models/category_observation_model.dart';
import 'package:niceos_app/models/consent_record_model.dart';
import 'package:niceos_app/models/consumer_intercept_model.dart';
import 'package:niceos_app/models/daily_submission_model.dart';
import 'package:niceos_app/models/outlet_contact_model.dart';
import 'package:niceos_app/models/outlet_model.dart';
import 'package:niceos_app/services/quality_service.dart';
import 'package:niceos_app/services/sequence_lock.dart';
import 'package:niceos_app/services/straightlining.dart';

void main() {
  group('SurveySequenceLock (§4.6)', () {
    test('accepts a properly ordered unaided-then-aided capture', () {
      final lock = SurveySequenceLock();
      lock.recordUnaided(['Pembe']);
      lock.revealAidedList();
      lock.recordAided(['Pembe', 'Jogoo']);
      expect(() => lock.check(), returnsNormally);
      expect(lock.unaided, ['Pembe']);
    });

    test('throws when the aided list was revealed before the unaided answer', () {
      final lock = SurveySequenceLock();
      lock.revealAidedList(); // violation: list shown too early
      lock.recordUnaided(['Pembe']);
      lock.recordAided(['Pembe']);
      expect(() => lock.check(), throwsA(isA<SequenceLockViolation>()));
    });

    test('throws when no unaided answer exists at all', () {
      final lock = SurveySequenceLock();
      expect(() => lock.check(), throwsA(isA<SequenceLockViolation>()));
    });
  });

  group('StraightliningDetector (§5)', () {
    test('flags identical answers across consecutive records', () {
      final records = <Map<String, dynamic>>[];
      for (var i = 0; i < 6; i++) {
        records.add({
          'id': 'r$i',
          'purchase_frequency': 'weekly',
          'household_size': '3-4',
        });
      }
      final hits = StraightliningDetector.detect(records);
      expect(hits, isNotEmpty);
      final purchase = hits.where((h) => h.field == 'purchase_frequency').toList();
      expect(purchase, hasLength(1));
      expect(purchase.first.runLength, 6);
    });

    test('ignores ordering differences in multi-select lists', () {
      final records = <Map<String, dynamic>>[];
      for (var i = 0; i < 5; i++) {
        records.add({
          'id': 'r$i',
          'brands_present': i.isEven ? ['Pembe', 'Jogoo'] : ['Jogoo', 'Pembe'],
        });
      }
      final hits = StraightliningDetector.detect(records);
      expect(hits.where((h) => h.field == 'brands_present'), hasLength(1));
    });

    test('does not flag short runs or empty values', () {
      final records = <Map<String, dynamic>>[];
      for (var i = 0; i < 6; i++) {
        records.add({
          'id': 'r$i',
          'purchase_frequency': i == 5 ? 'monthly' : 'weekly',
          'household_size': '',
        });
      }
      final hits = StraightliningDetector.detect(records);
      expect(hits.where((h) => h.field == 'purchase_frequency'), hasLength(1));
      expect(hits.where((h) => h.field == 'household_size'), isEmpty);
    });
  });

  group('QualityService gates (§5)', () {
    test('GPS gate rejects fixes worse than 15 m', () {
      expect(qualityService.gateGps(null), QualityFlag.gpsGate);
      expect(qualityService.gateGps(15.1), QualityFlag.gpsGate);
      expect(qualityService.gateGps(15.0), isNull);
      expect(qualityService.gateGps(4.0), isNull);
    });

    test('storefront photo is mandatory', () {
      expect(qualityService.photoMandatory(false), QualityFlag.photoMandatory);
      expect(qualityService.photoMandatory(true), isNull);
    });

    test('visits under 4 minutes are flagged', () {
      expect(
        qualityService.speedFlag(const Duration(minutes: 3, seconds: 59)),
        QualityFlag.speedFlag,
      );
      expect(qualityService.speedFlag(const Duration(minutes: 4)), isNull);
    });

    test('proximity flags check-ins more than 50 m from the outlet', () {
      final outlet = OutletModel(
        id: 'o1',
        businessName: 'Nice Mart',
        channelCode: 'traditional',
        outletTypeCode: 'duka',
        gpsLat: -1.2833,
        gpsLng: 36.8167,
        createdBy: 'rep',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      expect(qualityService.proximityCheck(outlet, -1.2833, 36.8167), isNull);
      expect(qualityService.proximityCheck(outlet, -1.2838, 36.8172), isNotNull);
    });

    test('straightlining flag delegates to the detector', () {
      final records = <Map<String, dynamic>>[];
      for (var i = 0; i < 6; i++) {
        records.add({'id': 'r$i', 'purchase_frequency': 'daily'});
      }
      expect(qualityService.straightlining(records), QualityFlag.straightlining);
      expect(qualityService.straightlining([{'id': 'a'}, {'id': 'b'}]), isNull);
    });
  });

  group('Model round-trips', () {
    test('OutletContactModel preserves PD fields and consent link', () {
      final c = OutletContactModel(
        id: 'c1',
        outletId: 'o1',
        contactName: 'Wanjiru',
        roleCode: 'owner',
        phonePrimary: '0712345678',
        isDecisionMaker: true,
        consentId: 'cons-1',
        createdBy: 'rep',
        createdAt: DateTime.utc(2026, 8, 13, 9),
        updatedAt: DateTime.utc(2026, 8, 13, 9),
      );
      expect(c.role, ContactRole.owner);
      final back = OutletContactModel.fromJson(c.toJson());
      expect(back.contactName, 'Wanjiru');
      expect(back.phonePrimary, '0712345678');
      expect(back.consentId, 'cons-1');
      expect(back.isDecisionMaker, isTrue);
    });

    test('CategoryObservationModel round-trips brand lists', () {
      final now = DateTime.utc(2026, 8, 13);
      final obs = CategoryObservationModel(
        id: 'co1',
        visitId: 'v1',
        outletId: 'o1',
        repId: 'rep',
        categoryCode: 'maize_flour',
        stockedNow: true,
        brandsPresent: const ['Pembe', 'Jogoo'],
        packSizesPresent: const ['medium', 'large'],
        shelfFacings: 4,
        priceObserved: 135.0,
        stockUnitsOnHand: 12,
        stockoutLast7Days: true,
        createdBy: 'rep',
        createdAt: now,
        updatedAt: now,
      );
      final back = CategoryObservationModel.fromJson(obs.toJson());
      expect(back.brandsPresent, ['Pembe', 'Jogoo']);
      expect(back.shelfFacings, 4);
      expect(back.stockoutLast7Days, isTrue);
    });

    test('ConsumerInterceptModel round-trips awareness lists', () {
      final now = DateTime.utc(2026, 8, 13);
      final it = ConsumerInterceptModel(
        id: 'i1',
        ward: 'Ruiru',
        channelContextCode: 'traditional',
        householdSizeBand: '3-4',
        shopperRoleCode: 'main_shopper',
        categoriesBoughtWeekly: const ['maize_flour', 'fresh_milk'],
        unaidedBrandsAware: const ['Pembe'],
        aidedBrandsAware: const ['Pembe', 'Jogoo'],
        flourBrandUsedNow: 'Pembe',
        consentId: 'cons-2',
        enumeratorId: 'rep',
        capturedAt: now,
        updatedAt: now,
      );
      final back = ConsumerInterceptModel.fromJson(it.toJson());
      expect(back.unaidedBrandsAware, ['Pembe']);
      expect(back.aidedBrandsAware, ['Pembe', 'Jogoo']);
      expect(back.ward, 'Ruiru');
    });

    test('ConsentRecordModel round-trips', () {
      final c = ConsentRecordModel(
        id: 'cons-3',
        scriptVersion: 'v1.0',
        gpsLat: -1.28,
        gpsLng: 36.81,
        enumeratorId: 'rep',
        consentedAt: DateTime.utc(2026, 8, 13),
        reuseAgreed: true,
        updatedAt: DateTime.utc(2026, 8, 13),
      );
      final back = ConsentRecordModel.fromJson(c.toJson());
      expect(back.reuseAgreed, isTrue);
      expect(back.gpsLat, -1.28);
      expect(back.updatedAt, DateTime.utc(2026, 8, 13));
    });

    test('DailySubmissionModel round-trips flags and status', () {
      final s = DailySubmissionModel(
        id: 'd1',
        enumeratorId: 'rep',
        submissionDate: '2026-08-13',
        outletCount: 14,
        interceptCount: 9,
        qualityFlags: const ['straightlining:brands_present', 'back_check_due'],
        status: 'submitted',
        createdAt: DateTime.utc(2026, 8, 13, 18),
        updatedAt: DateTime.utc(2026, 8, 13, 18),
      );
      final back = DailySubmissionModel.fromJson(s.toJson());
      expect(back.outletCount, 14);
      expect(back.qualityFlags, hasLength(2));
      expect(back.status, 'submitted');
    });
  });
}
