import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'theme/brand.dart';

/// Central haptic + micro-motion layer for Kanini Field.
///
/// Call these at momentous / state-changing touch points so the phone
/// physically acknowledges the action: taps (navigation, toggles), confirms
/// (check-in, saves, sync), stamps (visit complete, day close, clock-out) and
/// rejects (GPS lock failure). All calls are fire-and-forget; a device without
/// a haptic engine simply stays silent.
abstract final class UiFx {
  /// Light tick for navigation and selection (scrolls the feeling along).
  static void tap() => HapticFeedback.selectionClick();

  /// Medium confirm for saves, check-ins, retries and sync flushes.
  static void confirm() => HapticFeedback.mediumImpact();

  /// Heavy slam for momentous stamps (visit complete, day close, clock-out).
  static void stamp() => HapticFeedback.heavyImpact();

  /// Short sharp buzz for rejections (GPS lock failed, validation error).
  static void reject() => HapticFeedback.lightImpact();

  /// Sustained ring for long-running or alarming states (offline warnings).
  static void ring() => HapticFeedback.vibrate();

  /// Wrap a handler so the caller's tap tick fires first. Pass an explicit
  /// [tick] to escalate the tick (e.g. confirm on a destructive retry).
  static VoidCallback? withTap(VoidCallback? handler, {VoidCallback? tick}) {
    if (handler == null) return null;
    final haptic = tick ?? tap;
    return () {
      haptic();
      handler();
    };
  }
}

/// The rotated stamp flourish — used alone (inline) or driven by
/// [UiFx.stampIn] for the centre-screen slam.
class MotionStamp extends StatelessWidget {
  final String text;
  final Color color;
  final String? detail;
  final double size;
  const MotionStamp(this.text, {super.key, this.color = Brand.stampGreen, this.detail, this.size = 150});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Transform.rotate(
          angle: -0.12,
          child: Container(
            width: size,
            height: size,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.06),
              border: Border.all(color: color, width: 4),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  text,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: color,
                    fontFamily: Brand.fontMono,
                    fontSize: 34,
                    height: 1.05,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.1,
                  ),
                ),
              ),
            ),
          ),
        ),
        if (detail != null) ...[
          const SizedBox(height: 14),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 280),
            child: Text(
              detail!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontFamily: Brand.fontMono,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Slams a [MotionStamp] into the centre of the screen (heavy haptic on land),
/// holds it for ~450ms, then dismisses. Awaits completion so callers can chain
/// navigation right after the flourish. [detail] renders as a mono caption
/// beneath the stamp (e.g. the outlet name on a census save).
Future<void> stampIn(
  BuildContext context, {
  required String text,
  Color color = Brand.stampGreen,
  String? detail,
}) async {
  UiFx.stamp();
  final held = showGeneralDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierLabel: 'Stamp',
    barrierColor: Colors.black.withValues(alpha: 0.28),
    transitionDuration: const Duration(milliseconds: 300),
    pageBuilder: (_, __, ___) =>
        Center(child: MotionStamp(text, color: color, detail: detail)),
    transitionBuilder: (_, animation, __, child) => AnimatedBuilder(
      animation: animation,
      builder: (_, __) {
        final t = Curves.easeOutBack.transform(animation.value);
        return Opacity(
          opacity: (animation.value * 4).clamp(0.0, 1.0),
          child: Transform.scale(scale: 2.6 - 1.6 * t, child: child),
        );
      },
    ),
  );
  await Future<void>.delayed(const Duration(milliseconds: 1100));
  if (context.mounted) {
    Navigator.of(context, rootNavigator: true).pop();
  }
  await held;
}

/// Numeric style applied to counters so digits never jitter while counting —
/// every mono number on the field will run with tabular figures.
TextStyle monoNumber({Color color = Brand.ink, double fontSize = 22, FontWeight weight = FontWeight.w800}) {
  return TextStyle(
    color: color,
    fontFamily: Brand.fontMono,
    fontSize: fontSize,
    fontWeight: weight,
    height: 1,
    fontFeatures: const [FontFeature.tabularFigures()],
  );
}