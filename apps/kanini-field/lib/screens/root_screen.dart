import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/shift_provider.dart';
import 'home_shell.dart';
import 'login_screen.dart';
import 'onboarding_screen.dart';
import 'shift_screen.dart';

/// Routes the rep: onboarding on first launch -> login; authenticated but not
/// yet clocked in for today -> shift gate (the first objective after login);
/// clocked in -> the main 5-tab shell.
class RootScreen extends StatefulWidget {
  const RootScreen({super.key});

  @override
  State<RootScreen> createState() => _RootScreenState();
}

class _RootScreenState extends State<RootScreen> {
  bool? _onboarded;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final shift = context.read<ShiftProvider>();
      shift.init();
      shift.autoCheck();
      final done = await OnboardingScreen.isDone();
      if (mounted) setState(() => _onboarded = done);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final shift = context.watch<ShiftProvider>();
    if (_onboarded == false) {
      return OnboardingScreen(
        key: UniqueKey(),
        onFinished: () => setState(() => _onboarded = true),
      );
    }
    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }
    if (shift.needsClockIn) {
      return const ShiftScreen(gate: true);
    }
    return const HomeShell();
  }
}