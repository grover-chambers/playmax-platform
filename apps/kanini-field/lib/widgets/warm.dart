import 'package:flutter/material.dart';

import '../theme/brand.dart';
import '../ui_fx.dart';

/// Uppercase mono eyebrow label used above titles and sections.
class Eyebrow extends StatelessWidget {
  final String text;
  final Color color;
  const Eyebrow(this.text, {super.key, this.color = Brand.inkSoft});

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: color,
        fontFamily: Brand.fontMono,
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.16,
      ),
    );
  }
}

enum StampStatus { visited, skipped, pending }

/// Rotated stamp tag — the "VISITED / PENDING / SKIPPED" flourish.
class StampTag extends StatelessWidget {
  final StampStatus status;
  final String? label;
  final bool animate;
  const StampTag(this.status, {super.key, this.label, this.animate = false});

  Color get _color => switch (status) {
        StampStatus.visited => Brand.stampGreen,
        StampStatus.skipped => Brand.stampRed,
        StampStatus.pending => Brand.pendingGrey,
      };

  @override
  Widget build(BuildContext context) {
    final text = (label ?? status.name).toUpperCase();
    return Transform.rotate(
      angle: -0.12,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          border: Border.all(
            color: _color,
            width: 2,
            style: status == StampStatus.pending ? BorderStyle.solid : BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(8),
          color: Colors.transparent,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: _color,
            fontFamily: Brand.fontMono,
            fontSize: 9.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.08,
          ),
        ),
      ),
    );
  }
}

/// Primary amber button with the mockup's hard-bottom-shadow press effect.
class AmberButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final bool outlined;
  final Color? color;
  const AmberButton(
    this.label, {
    super.key,
    this.onPressed,
    this.loading = false,
    this.outlined = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final base = color ?? Brand.amber;
    final bg = outlined ? Brand.card : base;
    final fg = outlined ? Brand.ink : Brand.ink;
    final border = outlined ? Border.all(color: Brand.lineStrong, width: 1.5) : null;
    final shadow = outlined ? null : const BoxShadow(color: Brand.amberDeep, offset: Offset(0, 6), blurRadius: 0);

    return SizedBox(
      width: double.infinity,
      child: Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), boxShadow: shadow == null ? null : [shadow]),
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(10),
              border: border,
            ),
            child: InkWell(
              onTap: loading ? null : UiFx.withTap(onPressed),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 15),
                alignment: Alignment.center,
                child: loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: Brand.ink),
                      )
                    : Text(
                        label,
                        style: TextStyle(
                          color: fg,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          fontFamily: Brand.fontBody,
                        ),
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Cream card with the mockup hairline border.
class WarmCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  const WarmCard({super.key, required this.child, this.padding = const EdgeInsets.all(14), this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Brand.card,
        border: Border.all(color: Brand.line, width: 1.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: UiFx.withTap(onTap),
          borderRadius: BorderRadius.circular(12),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

/// Section title row used above lists ("Today's route, in order · 7 stops").
class SectionTitle extends StatelessWidget {
  final String title;
  final String? trailing;
  const SectionTitle(this.title, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Eyebrow(title),
          if (trailing != null)
            Text(
              trailing!,
              style: TextStyle(
                color: Brand.inkSoft,
                fontFamily: Brand.fontMono,
                fontSize: 12,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
        ],
      ),
    );
  }
}

/// App header: eyebrow + title + optional subtitle, with right-side avatar.
class AppHeader extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String? subtitle;
  final String? avatar;
  final List<Widget>? actions;
  const AppHeader({
    super.key,
    required this.eyebrow,
    required this.title,
    this.subtitle,
    this.avatar,
    this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Eyebrow(eyebrow),
                const SizedBox(height: 3),
                Text(
                  title,
                  style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: Brand.ink, letterSpacing: -0.02),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 3),
                  Text(subtitle!, style: const TextStyle(fontSize: 12.5, color: Brand.inkSoft)),
                ],
              ],
            ),
          ),
          if (avatar != null)
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: Brand.ink, shape: BoxShape.circle),
              child: Text(
                avatar!,
                style: const TextStyle(color: Brand.paper, fontWeight: FontWeight.w800, fontSize: 13, fontFamily: Brand.fontMono),
              ),
            ),
          if (actions != null) ...actions!,
        ],
      ),
    );
  }
}

/// KPI tile: big mono number + uppercase label.
class KpiTile extends StatelessWidget {
  final String number;
  final String label;
  final Color? numberColor;
  const KpiTile(this.number, this.label, {super.key, this.numberColor});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: WarmCard(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              number,
              style: TextStyle(
                color: numberColor ?? Brand.ink,
                fontFeatures: const [FontFeature.tabularFigures()],
                fontFamily: Brand.fontMono,
                fontSize: 22,
                fontWeight: FontWeight.w800,
                height: 1,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              label.toUpperCase(),
              style: const TextStyle(fontSize: 10.5, letterSpacing: 0.08, color: Brand.inkSoft),
            ),
          ],
        ),
      ),
    );
  }
}

/// Thin divider that matches the mockup (2px ink rules).
class InkDivider extends StatelessWidget {
  final double thickness;
  const InkDivider({super.key, this.thickness = 1.5});

  @override
  Widget build(BuildContext context) {
    return Divider(thickness: thickness, height: 1, color: Brand.lineStrong);
  }
}