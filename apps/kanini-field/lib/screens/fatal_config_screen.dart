import 'package:flutter/material.dart';

import '../theme/brand.dart';

/// Branded fatal screen shown ONLY when the app cannot run for real:
/// Supabase config is missing/placeholder, or `Supabase.initialize` failed.
///
/// Fail-closed contract: never a blank screen, never a demo fallback. The rep
/// sees exactly one branded message and is pointed at installing a proper
/// build. No credentials are accepted on this screen.
class FatalConfigScreen extends StatelessWidget {
  const FatalConfigScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.ink,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 84,
                    height: 84,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Brand.amber,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Transform.rotate(
                      angle: -0.1,
                      child: const Text(
                        'N',
                        style: TextStyle(
                          color: Brand.ink,
                          fontSize: 46,
                          fontWeight: FontWeight.w800,
                          fontFamily: Brand.fontMono,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'KANINI HARAKA LIMITED',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Brand.amber,
                      fontFamily: Brand.fontMono,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.22,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Missing configuration',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'This build cannot connect to the Kanini Field platform.\n\n'
                    'Install the latest Kanini Field build from your route lead or the '
                    'admin desk, then try again.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}