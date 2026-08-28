import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../config/field_config.dart';
import '../domain/typology.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';

/// ONBOARDING — the 10-screen SOP walkthrough (mockup parity). Instructional
/// only; it teaches the loop the Visit Flow then enforces. Completion is a
/// local Hive flag; shown once, reachable again from Profile.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.onFinished});

  /// Called after the completion flag is persisted. RootScreen uses this to
  /// swap to login without popping its own route.
  final VoidCallback? onFinished;

  static const _flagBox = 'app_flags';

  static Future<bool> isDone() async {
    final box = await Hive.openBox<String>(_flagBox);
    return box.get('onboarding_done') == '1';
  }

  static Future<void> markDone() async {
    final box = await Hive.openBox<String>(_flagBox);
    await box.put('onboarding_done', '1');
  }

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    if (_page < 9) {
      UiFx.tap();
      _controller.nextPage(
          duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    } else {
      UiFx.confirm();
      await OnboardingScreen.markDone();
      if (mounted) widget.onFinished?.call();
    }
  }

  void _back() {
    if (_page > 0) {
      UiFx.tap();
      _controller.previousPage(
          duration: const Duration(milliseconds: 250), curve: Curves.easeIn);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.paper,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 24, 0),
              child: Row(
                children: [
                  if (_page > 0)
                    IconButton(
                      icon: const Icon(Icons.arrow_back,
                          color: Brand.ink, size: 22),
                      tooltip: 'Back',
                      onPressed: _busyGuard() ? null : _back,
                    )
                  else
                    const SizedBox(width: 48),
                  Expanded(
                    child: Text(
                      _page == 0 ? '' : _pages[_page].title,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: Brand.ink,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.2),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Expanded(
              child: PageView(
                controller: _controller,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) => setState(() => _page = i),
                children: [
                  for (final p in _pages) _Shell(page: p),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${_page + 1} of ${_pages.length}',
                      style: const TextStyle(
                          color: Brand.pendingGrey,
                          fontSize: 12,
                          letterSpacing: 0.5)),
                  Row(
                    children: [
                      for (var i = 0; i < _pages.length; i++)
                        Container(
                          width: 16,
                          height: 4,
                          margin: const EdgeInsets.only(left: 4),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(2),
                            color: i <= _page ? Brand.amberDeep : Brand.line,
                          ),
                        ),
                    ],
                  ),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: Brand.ink),
                    onPressed: _busyGuard() ? null : _next,
                    child:
                        Text(_page == _pages.length - 1 ? 'Sign in' : 'Next'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _busyGuard() => false;
}

class _Page {
  final String? kicker;
  final String title;

  final String? subtitle;
  final List<String>? bullets;
  final List<(String, String)>? cards; // (heading, body)
  final String? footer;

  const _Page(
      {this.kicker,
      required this.title,
      this.subtitle,
      this.bullets,
      this.cards,
      this.footer});
}

final List<_Page> _pages = [
  _Page(title: 'Welcome to Kanini Field', subtitle: "You're mapping outlets "
      'for Kanini. Every record becomes part of the map — get the details '
      'right and it holds up.'),
  _Page(kicker: 'Step 1 of 4 · about 30 sec', title: '01 Observe',
      subtitle: 'Phone stays in pocket', bullets: const [
    "Is it open, and is it actually a retail outlet?",
    'Read the signboard, note the name exactly as painted',
    "What's on the shelf — which flour brands, how many facings?",
    "Who's in charge: owner or someone minding the shop?",
  ], footer: "Hard rule: don't open the app before you've looked"),
  _Page(kicker: 'Step 2 of 4', title: '02 Record',
      subtitle: 'Capture while you stand there'),
  _Page(kicker: 'Step 3 of 4', title: '03 Question',
      subtitle: 'Consent first. A refusal still records the observation.'),
  _Page(kicker: 'Step 4 of 4', title: '04 Proceed',
      subtitle: 'Pick one outcome and move to the next outlet.'),
  _Page(title: 'What a complete record carries',
      subtitle: 'Miss any field and the record is incomplete',
      cards: const [
        ('Location', 'GPS pin captured at the door'),
        ('Identity', 'Outlet name and type'),
        ('Contact', 'Owner or manager, working phone'),
        ('Shelf', 'Flour brands stocked and facings'),
      ], footer: 'Plus proof, volume, supply, landmark'),
  const _Page(title: 'The pin is the record', bullets: [
    'Stand at the shop door, not across the road',
    'Signal drifts under canopies — step out, pin, step back',
    'Never pin several shops from one spot',
    'Wait for the accuracy reading to settle before you tap',
    'Check the pin landed on the correct side of the road',
  ]),
  _Page(title: 'Every visit gets exactly one outcome',
      cards: [for (final o in VisitOutcome.values) (o.label, o.description)]),
  _Page(title: '${FieldConfig.dailyTargetOutlets}',
      kicker: 'Your target',
      subtitle: 'outlets a day, working band '
          '${FieldConfig.dailyTargetBandMin}–${FieldConfig.dailyTargetBandMax}.'
          '\nSix days a week, Monday to Saturday.',
      footer: "The six-day week gives you a real margin — one bad day won't "
          'sink the wave.'),
  _Page(title: 'Ready to start',
      subtitle: "That's the loop. Field guide and safety are always one tap "
          'away.'),
];

class _Shell extends StatelessWidget {
  final _Page page;

  const _Shell({required this.page});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (page.kicker != null)
            Text(page.kicker!.toUpperCase(),
                style: const TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w600,
                    color: Brand.amberDeep)),
          const SizedBox(height: 8),
          Center(
            child: Text(page.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 26, height: 1.2, fontWeight: FontWeight.w700)),
          ),
          if (page.subtitle != null) ...[
            const SizedBox(height: 10),
            Center(
              child: Text(page.subtitle!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 14, height: 1.6, color: Brand.inkSoft)),
            ),
          ],
          const SizedBox(height: 24),
          if (page.bullets != null)
            for (final b in page.bullets!)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.circle, size: 8, color: Brand.pendingGrey),
                    const SizedBox(width: 10),
                    Expanded(
                        child: Text(b,
                            style: const TextStyle(
                                fontSize: 14, height: 1.5))),
                  ],
                ),
              ),
          if (page.cards != null)
            for (final c in page.cards!)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Brand.card,
                  border: Border.all(color: Brand.line),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.$1,
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Brand.amberDeep)),
                    const SizedBox(height: 2),
                    Text(c.$2,
                        style: const TextStyle(
                            fontSize: 13, height: 1.45, color: Brand.inkSoft)),
                  ],
                ),
              ),
          if (page.footer != null) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Brand.stampRed, width: 1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(page.footer!,
                  style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.5,
                      fontWeight: FontWeight.w500)),
            ),
          ],
        ],
      ),
    );
  }
}
