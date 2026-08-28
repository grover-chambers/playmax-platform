import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';

import 'package:niceos_app/providers/auth_provider.dart';
import 'package:niceos_app/providers/intercept_provider.dart';
import 'package:niceos_app/screens/consumer_intercept_flow.dart';
import 'package:niceos_app/services/location_service.dart';
import 'package:niceos_app/services/quality_service.dart';
import 'package:niceos_app/services/sync_service.dart';

class _FakeLocation extends LocationService {
  _FakeLocation(this.fix);

  final Position fix;

  @override
  Future<Position?> getCurrentPosition() async => fix;
}

/// Widget tests run without a Supabase project, so the real [AuthProvider]
/// stays unauthenticated (there is no demo fallback anymore). This subclass
/// fakes only the *session state* — it never fakes login or credentials —
/// so the flow's "must be authenticated" guard is satisfied.
class _AuthenticatedAuth extends AuthProvider {
  @override
  AppUser? get currentUser =>
      const AppUser(id: 'rep-1', email: 'rep@nice.ke', fullName: 'Test Rep');

  @override
  bool get isAuthenticated => true;
}

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

void main() {
  late Directory tmp;
  late InterceptProvider intercepts;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    tmp = Directory.systemTemp.createTempSync('niceos_widget_test');
    Hive.init(tmp.path);
    await syncService.init();
    await qualityService.init();
  });

  setUp(() async {
    final box = await Hive.openBox<Map<String, dynamic>>('intercepts_local');
    await box.clear();
    intercepts = InterceptProvider();
    await intercepts.init();
  });

  tearDownAll(() async {
    try {
      tmp.deleteSync(recursive: true);
    } catch (_) {}
  });

  Future<void> pumpFlow(WidgetTester tester) async {
    // Tall viewport so the current step's controls are always on screen and
    // hittable without scrolling the Stepper's internal ListView.
    tester.view.physicalSize = const Size(1080, 2600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>(
            create: (_) => _AuthenticatedAuth(),
          ),
          ChangeNotifierProvider<InterceptProvider>.value(value: intercepts),
        ],
        child: MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: FilledButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ConsumerInterceptFlow(
                        location: _FakeLocation(_fix()),
                      ),
                    ),
                  ),
                  child: const Text('Open flow'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open flow'));
    await tester.pumpAndSettle();
  }

  Future<void> tapNext(WidgetTester tester) async {
    await tester.tap(find.widgetWithText(FilledButton, 'Next').hitTestable());
    await tester.pumpAndSettle();
  }

  Future<void> lockGps(WidgetTester tester) async {
    final gpsBtn = find.widgetWithText(FilledButton, 'Acquire GPS fix');
    await tester.ensureVisible(gpsBtn);
    await tester.pumpAndSettle();
    await tester.tap(gpsBtn);
    await tester.pumpAndSettle();
  }

  Future<void> selectShopperRole(WidgetTester tester) async {
    final dropdown = find.byWidgetPredicate(
      (w) => w is DropdownButtonFormField && w.decoration.labelText == 'Shopper role',
    );
    await tester.ensureVisible(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(dropdown);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Main shopper').last);
    await tester.pumpAndSettle();
  }

  testWidgets('gates: GPS then consent must be satisfied before advancing',
      (tester) async {
    await pumpFlow(tester);

    // Ward entered but no GPS fix → blocked on step 0.
    await tester.enterText(
        find.widgetWithText(TextField, 'Ward *'), 'Ruiru');
    await tapNext(tester);
    expect(find.text('Acquire a GPS fix first.'), findsOneWidget);
    // Let the snackbar expire so the next one is not queued behind it.
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    // Lock GPS → move to consent step.
    await lockGps(tester);
    expect(find.textContaining('Fix locked'), findsOneWidget);
    await tapNext(tester);

    // No consent → blocked on step 1.
    await tapNext(tester);
    expect(find.text('Consent is required.'), findsOneWidget);
  });

  testWidgets('aided brand list stays locked until an unaided brand is captured',
      (tester) async {
    await pumpFlow(tester);

    await tester.enterText(
        find.widgetWithText(TextField, 'Ward *'), 'Ruiru');
    await lockGps(tester);
    await tapNext(tester);

    await tester.tap(find.text('Respondent agreed to take part'));
    await tester.pumpAndSettle();
    await tapNext(tester);

    await tester.tap(find.text('3–4'));
    await tester.pumpAndSettle();
    await selectShopperRole(tester);
    await tapNext(tester);

    final reveal = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Show the aided brand list'),
    );
    expect(reveal.onPressed, isNull);
  });

  testWidgets('full flow: GPS, consent, unaided→aided sequence, submit',
      (tester) async {
    await pumpFlow(tester);

    // Step 0 — location + GPS.
    await tester.enterText(
        find.widgetWithText(TextField, 'Ward *'), 'Ruiru');
    await lockGps(tester);
    await tapNext(tester);

    // Step 1 — consent.
    await tester.tap(find.text('Respondent agreed to take part'));
    await tester.pumpAndSettle();
    await tapNext(tester);

    // Step 2 — shopper profile.
    await tester.tap(find.text('3–4'));
    await tester.pumpAndSettle();
    await selectShopperRole(tester);
    await tapNext(tester);

    // Step 3 — awareness: unaided first, then reveal the aided list.
    await tester.enterText(
        find.widgetWithText(TextField, 'Brand name'), 'Pembe');
    await tester.tap(find.byIcon(Icons.add_circle));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(Chip, 'Pembe'), findsOneWidget);
    await tester.tap(find.text('Show the aided brand list'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Nice'));
    await tester.pumpAndSettle();
    await tapNext(tester);

    // Step 4 — purchase (all optional).
    await tapNext(tester);

    // Step 5 — review and submit.
    expect(find.text('Pembe'), findsWidgets);
    final submit =
        find.widgetWithText(FilledButton, 'Submit Intercept').hitTestable();
    await tester.ensureVisible(submit);
    await tester.pumpAndSettle();
    await tester.tap(submit);
    // Hive's box writes do not complete inside the fake-async test zone, so
    // interleave real-async turns to let the submit's persistence finish.
    for (var i = 0;
        i < 50 && find.text('Intercept saved').evaluate().isEmpty;
        i++) {
      await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 5)));
      await tester.pump(const Duration(milliseconds: 10));
    }
    await tester.pumpAndSettle();
    expect(find.text('Intercept saved'), findsOneWidget);
    expect(intercepts.capturedIntercepts, hasLength(1));

    final saved = intercepts.capturedIntercepts.single;
    expect(saved.ward, 'Ruiru');
    expect(saved.householdSizeBand, '3–4');
    expect(saved.unaidedBrandsAware, ['Pembe']);
    expect(saved.aidedBrandsAware, ['Nice']);
    expect(saved.enumeratorId, 'rep-1');
  });
}
