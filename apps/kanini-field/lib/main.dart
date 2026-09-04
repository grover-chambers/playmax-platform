import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'providers/auth_provider.dart';
import 'providers/census_provider.dart';
import 'providers/intercept_provider.dart';
import 'providers/retailer_provider.dart';
import 'providers/shift_provider.dart';
import 'providers/route_master_provider.dart';
import 'providers/submission_provider.dart';
import 'providers/sync_provider.dart';
import 'screens/check_in_screen.dart';
import 'screens/fatal_config_screen.dart';
import 'screens/splash_screen.dart';
import 'services/quality_service.dart';
import 'services/supabase_service.dart';
import 'services/sync_service.dart';
import 'theme/brand.dart';

bool _isRealConfig(String v) {
  final s = v.trim();
  if (s.isEmpty) return false;
  final lower = s.toLowerCase();
  if (lower.contains('placeholder')) return false;
  if (lower.contains('your-project')) return false;
  if (lower == 'your-anon-key') return false;
  return true;
}

Widget _buildErrorScreen(Object error, StackTrace stack) {
  return MaterialApp(
    home: Scaffold(
      backgroundColor: Brand.paper,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Brand.stampRed),
                const SizedBox(height: 16),
                const Text(
                  'Kanini Field crashed',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Brand.ink),
                ),
                const SizedBox(height: 12),
                Text(
                  error.toString(),
                  style: const TextStyle(fontSize: 13, color: Brand.inkSoft),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  stack.toString(),
                  style: const TextStyle(fontSize: 10, color: Brand.pendingGrey),
                  textAlign: TextAlign.left,
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    return true;
  };

  runZonedGuarded(() async {
    var dotenvLoaded = false;
    try {
      await dotenv.load(fileName: '.env');
      dotenvLoaded = true;
    } catch (_) {}

    await Hive.initFlutter();
    await syncService.init();
    await qualityService.init();

    final url = (dotenvLoaded ? dotenv.env['SUPABASE_URL'] : null) ??
        const String.fromEnvironment('SUPABASE_URL');
    final anonKey = (dotenvLoaded ? dotenv.env['SUPABASE_ANON_KEY'] : null) ??
        const String.fromEnvironment('SUPABASE_ANON_KEY');

    final configured = _isRealConfig(url) && _isRealConfig(anonKey);
    if (!configured) {
      runApp(const FatalConfigScreen());
      return;
    }

    try {
      await Supabase.initialize(url: url, publishableKey: anonKey)
          .timeout(const Duration(seconds: 10));
      await SupabaseService.instance.init();
    } catch (_) {
      runApp(const FatalConfigScreen());
      return;
    }

    runApp(const KaniniFieldApp());
  }, (error, stack) {
    // Unhandled async errors land here instead of killing the process.
  });
}

class KaniniFieldApp extends StatelessWidget {
  const KaniniFieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    final syncProvider = SyncProvider();
    final shiftProvider = ShiftProvider()..sync = syncProvider;
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => RetailerProvider()),
        ChangeNotifierProvider(create: (_) => syncProvider),
        ChangeNotifierProvider(create: (_) => CensusProvider(shift: shiftProvider)),
        ChangeNotifierProvider(create: (_) => InterceptProvider(shift: shiftProvider)),
        ChangeNotifierProvider(create: (_) => SubmissionProvider(shift: shiftProvider)),
        ChangeNotifierProvider(create: (_) => RouteMasterProvider()),
        ChangeNotifierProvider(create: (_) => shiftProvider),
        Provider<SupabaseService>(create: (_) => SupabaseService.instance),
      ],
      child: MaterialApp(
        title: Brand.appName,
        debugShowCheckedModeBanner: false,
        theme: Brand.theme(),
        home: const SplashScreen(),
        routes: {
          '/check-in': (context) => const CheckInScreen(),
        },
      ),
    );
  }
}
