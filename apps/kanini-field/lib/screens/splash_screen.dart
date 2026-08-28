import 'package:flutter/material.dart';

import '../theme/brand.dart';
import 'root_screen.dart';

/// Branded splash: fades the Kanini Field mark in, holds, fades out over ~3s, then
/// hands off to [RootScreen] (login or rep dashboard depending on auth state).
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;
  late final Animation<double> _markScale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 3));
    _opacity = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.0).chain(CurveTween(curve: Curves.easeIn)), weight: 1),
      TweenSequenceItem(tween: ConstantTween(1.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0).chain(CurveTween(curve: Curves.easeOut)), weight: 1),
    ]).animate(_controller);
    _markScale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.82, end: 1.0).chain(CurveTween(curve: Curves.easeOutBack)), weight: 1),
      TweenSequenceItem(tween: ConstantTween(1.0), weight: 3),
    ]).animate(_controller);
    _controller.forward().whenComplete(() {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const RootScreen()),
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.ink,
      body: Center(
        child: FadeTransition(
          opacity: _opacity,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ScaleTransition(
                scale: _markScale,
                child: Container(
                width: 96,
                height: 96,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Brand.amber,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(color: Brand.amber.withValues(alpha: 0.35), blurRadius: 30),
                  ],
                ),
                child: Transform.rotate(
                  angle: -0.1,
                  child: const Text(
                    'N',
                    style: TextStyle(
                      color: Brand.ink,
                      fontSize: 54,
                      fontWeight: FontWeight.w800,
                      fontFamily: Brand.fontMono,
                    ),
                  ),
                ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Kanini Field',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'FIELD REP APP',
                style: TextStyle(
                  color: Brand.amber,
                  fontFamily: Brand.fontMono,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.28,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}