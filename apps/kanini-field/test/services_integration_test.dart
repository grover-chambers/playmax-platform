import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:niceos_app/domain/typology.dart';
import 'package:niceos_app/services/census_service.dart';
import 'package:niceos_app/services/intercept_service.dart';
import 'package:niceos_app/services/quality_service.dart';
import 'package:niceos_app/services/sequence_lock.dart';
import 'package:niceos_app/services/sync_service.dart';

Position _fix({double accuracy = 4.0}) => Position(
      latitude: -1.2833,
      longitude: 36.8167,
      accuracy: accuracy,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
      timestamp: DateTime.now(),
    );

SurveySequenceLock _orderedLock() {
  final lock = SurveySequenceLock();
  lock.recordUnaided(['Pembe']);
  lock.revealAidedList();
  lock.recordAided(['Pembe', 'Jogoo']);
  return lock;
}

InterceptDraft _interceptDraft({double? accuracy = 4.0}) {
  final d = InterceptDraft();
  d.ward = 'Ruiru';
  d.gpsFix = accuracy == null ? null : _fix(accuracy: accuracy);
  d.consentAgreed = true;
  d.householdSizeBand = '3-4';
  d.shopperRoleCode = 'main_shopper';
  d.categoriesBoughtWeekly = ['maize_flour', 'fresh_milk'];
  d.flourBrandUsedNow = 'Pembe';
  return d;
}

CensusDraft _censusDraft({String name = 'Nice Mart', bool withPhoto = true}) {
  final d = CensusDraft();
  d.businessName = name;
  d.channel = Channel.traditionalTrade;
  d.outletType = OutletType.duka;
  d.county = 'Kiambu';
  d.constituency = 'Ruiru';
  d.ward = 'Kihunguro';
  d.beat = 'B2';
  d.gpsFix = _fix();
  d.storefrontPhotoPath = withPhoto ? '/tmp/storefront.jpg' : null;
  d.consentAgreed = true;
  d.consentReuseAgreed = true;
  d.contactName = 'Wanjiru';
  d.contactRole = ContactRole.owner;
  d.contactPhone = '0712345678';
  d.sizeTier = OutletSizeTier.small;
  d.clientStatuses['nice'] = ClientStatus.activeCustomer.code;
  d.categoryDrafts.add(CategoryDraft(ProductCategory.maizeFlour)
    ..brandsPresent = const ['Nice', 'Pembe']
    ..shelfFacings = 3);
  return d;
}

void main() {
  late Directory tmp;

  setUpAll(() async {
    tmp = Directory.systemTemp.createTempSync('niceos_services_test');
    Hive.init(tmp.path);
    await syncService.init();
    await qualityService.init();
  });

  setUp(() async {
    await syncService.pendingSyncBox.clear();
    final censusLog = await Hive.openBox<String>('census_log');
    await censusLog.clear();
  });

  tearDownAll(() async {
    try {
      tmp.deleteSync(recursive: true);
    } catch (_) {}
  });

  group('InterceptService (§4.6)', () {
    test('accepts a consented, correctly ordered intercept and enqueues rows',
        () async {
      final intercept = await interceptService.submitIntercept(
        draft: _interceptDraft(),
        lock: _orderedLock(),
        repId: 'rep-1',
      );

      expect(intercept.ward, 'Ruiru');
      expect(intercept.unaidedBrandsAware, ['Pembe']);
      expect(intercept.aidedBrandsAware, ['Pembe', 'Jogoo']);
      expect(intercept.consentId, isNotEmpty);
      expect(intercept.enumeratorId, 'rep-1');

      final entities = syncService.pendingItems.map((i) => i['entity']).toList();
      expect(entities, hasLength(2));
      expect(entities, containsAll(['consent_records', 'consumer_intercepts']));
    });

    test('rejects without consent and queues nothing', () async {
      final draft = _interceptDraft()..consentAgreed = false;
      expect(
        () => interceptService.submitIntercept(
            draft: draft, lock: _orderedLock(), repId: 'rep-1'),
        throwsA(isA<InterceptRejectedException>()),
      );
      expect(syncService.pendingCount, 0);
    });

    test('rejects when the aided list was shown before the unaided answer',
        () async {
      final lock = SurveySequenceLock();
      lock.revealAidedList();
      lock.recordUnaided(['Pembe']);
      lock.recordAided(['Pembe']);
      expect(
        () => interceptService.submitIntercept(
            draft: _interceptDraft(), lock: lock, repId: 'rep-1'),
        throwsA(isA<InterceptRejectedException>()),
      );
      expect(syncService.pendingCount, 0);
    });

    test('rejects a missing or weak GPS fix', () async {
      expect(
        () => interceptService.submitIntercept(
            draft: _interceptDraft(accuracy: null),
            lock: _orderedLock(),
            repId: 'rep-1'),
        throwsA(isA<InterceptRejectedException>()),
      );
      expect(
        () => interceptService.submitIntercept(
            draft: _interceptDraft(accuracy: 50),
            lock: _orderedLock(),
            repId: 'rep-1'),
        throwsA(isA<InterceptRejectedException>()),
      );
      expect(syncService.pendingCount, 0);
    });
  });

  group('CensusService (§4)', () {
    test('accepts a complete census and queues parents before children',
        () async {
      final result =
          await censusService.submitCensus(draft: _censusDraft(), repId: 'rep-1');

      expect(result.outlet.businessName, 'Nice Mart');
      expect(result.outlet.createdBy, 'rep-1');
      expect(result.contact.consentId, isNotNull);
      expect(result.categoryObservations, hasLength(1));

      final entities = syncService.pendingItems
          .map((i) => i['entity'] as String)
          .toList();
      expect(entities.toSet(), {
        'consent_records',
        'outlets',
        'outlet_contacts',
        'outlet_client_links',
        'visits',
        'category_observations',
      });

      // Parents must be pushed before children so `sync_apply` never hits a
      // foreign-key violation on a not-yet-applied row.
      expect(
        SyncService.orderedEntities(entities),
        [
          'consent_records',
          'outlets',
          'outlet_contacts',
          'outlet_client_links',
          'visits',
          'category_observations',
        ],
      );
    });

    test('rejects without consent and queues nothing', () async {
      final draft = _censusDraft()..consentAgreed = false;
      expect(
        () => censusService.submitCensus(draft: draft, repId: 'rep-1'),
        throwsA(isA<CensusRejectedException>()),
      );
      expect(syncService.pendingCount, 0);
    });

    test('rejects a missing storefront photo', () async {
      try {
        await censusService.submitCensus(
            draft: _censusDraft(withPhoto: false), repId: 'rep-1');
        fail('expected CensusRejectedException');
      } on CensusRejectedException catch (e) {
        expect(e.flags, contains(QualityFlag.photoMandatory));
      }
      expect(syncService.pendingCount, 0);
    });

    test('rejects a weak GPS fix', () async {
      final draft = _censusDraft();
      draft.gpsFix = _fix(accuracy: 30);
      try {
        await censusService.submitCensus(draft: draft, repId: 'rep-1');
        fail('expected CensusRejectedException');
      } on CensusRejectedException catch (e) {
        expect(e.flags, contains(QualityFlag.gpsGate));
      }
      expect(syncService.pendingCount, 0);
    });

    test('one-visit rule rejects a second census for the same outlet today',
        () async {
      await censusService.submitCensus(draft: _censusDraft(), repId: 'rep-1');
      expect(syncService.pendingCount, 6);

      try {
        await censusService.submitCensus(draft: _censusDraft(), repId: 'rep-1');
        fail('expected CensusRejectedException');
      } on CensusRejectedException catch (e) {
        expect(e.flags, contains(QualityFlag.oneVisitRule));
      }
      // Nothing from the rejected attempt may enter the queue.
      expect(syncService.pendingCount, 6);
    });
  });
}
