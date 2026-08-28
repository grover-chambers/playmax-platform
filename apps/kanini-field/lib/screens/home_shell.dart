import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/census_provider.dart';
import '../providers/intercept_provider.dart';
import '../providers/submission_provider.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/sync_badge.dart';
import 'census_screen.dart';
import 'dashboard_screen.dart';
import 'field_guide_screen.dart';
import 'intercept_screen.dart';
import 'profile_screen.dart';
import 'safety_sheet.dart';
import 'shift_screen.dart';
import 'submissions_screen.dart';
import 'team_management_screen.dart';
import 'visits_screen.dart';

/// Home shell: static 5-tab bottom nav with Census as the central, enlarged
/// action, plus a shared top bar with a menu (quick actions) and profile avatar.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 2;

  static const _titles = ['Submissions', 'Census', 'Dashboard', 'Intercept', 'Visits'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CensusProvider>().init();
      context.read<InterceptProvider>().init();
      context.read<SubmissionProvider>().init();
      // Update check now lives on the dashboard (landing tab) so the alert is
      // surfaced there — see DashboardScreen.
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu, color: Brand.ink),
            onPressed: () {
              UiFx.tap();
              Scaffold.of(ctx).openDrawer();
            },
            tooltip: 'Menu',
          ),
        ),
        title: Text(_titles[_index]),
        actions: [
          const SyncBadge(),
          IconButton(
            icon: const Icon(Icons.emergency, color: Brand.stampRed),
            tooltip: 'Safety',
            onPressed: () {
              UiFx.confirm();
              SafetySheet.show(context);
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: GestureDetector(
              onTap: UiFx.withTap(() => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ProfileScreen()),
                  )),
              child: _Avatar(name: auth.displayName),
            ),
          ),
        ],
      ),
      drawer: _MenuDrawer(
        onQuickSubmission: () => _goTo(0),
        onQuickCensus: () => _goTo(1),
        onQuickIntercept: () => _goTo(3),
        onQuickCompetitor: () {
          _goTo(4);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Open a stop to check in — competitor activity is captured inside a visit.'),
            ),
          );
        },
        onShift: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ShiftScreen()),
        ),
        onFieldGuide: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const FieldGuideScreen()),
        ),
        onTeamManagement: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const TeamManagementScreen()),
        ),
        onProfile: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ProfileScreen()),
        ),
      ),
      body: IndexedStack(
        index: _index,
        children: [
          _AnimatedTab(active: _index == 0, child: const SubmissionsScreen()),
          _AnimatedTab(active: _index == 1, child: const CensusScreen()),
          _AnimatedTab(active: _index == 2, child: DashboardScreen(onNavigate: _goTo)),
          _AnimatedTab(active: _index == 3, child: const InterceptScreen()),
          _AnimatedTab(active: _index == 4, child: const VisitsScreen()),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Brand.ink, width: 2)),
          color: Brand.paper,
        ),
        child: SafeArea(
          child: _BottomNav(index: _index, onChanged: _goTo),
        ),
      ),
    );
  }

  void _goTo(int i) {
    UiFx.tap();
    setState(() => _index = i);
    Navigator.of(context).popUntil((r) => r.isFirst);
  }
}

/// Fade + lift entrance applied to the active tab (state is preserved — the
/// shell still mounts every tab once via IndexedStack).
class _AnimatedTab extends StatefulWidget {
  final bool active;
  final Widget child;
  const _AnimatedTab({required this.active, required this.child});

  @override
  State<_AnimatedTab> createState() => _AnimatedTabState();
}

class _AnimatedTabState extends State<_AnimatedTab> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 260),
  );

  @override
  void initState() {
    super.initState();
    if (widget.active) _c.value = 1.0;
  }

  @override
  void didUpdateWidget(_AnimatedTab old) {
    super.didUpdateWidget(old);
    if (widget.active && !old.active) _c.forward(from: 0);
    if (!widget.active && old.active) _c.value = 1.0;
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final curved = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);
    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.012), end: Offset.zero).animate(curved),
        child: widget.child,
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String name;
  const _Avatar({required this.name});

  String get _initials {
    final parts = name.split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'N';
    return parts.take(2).map((p) => p[0]).join().toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 34,
      height: 34,
      alignment: Alignment.center,
      decoration: const BoxDecoration(color: Brand.ink, shape: BoxShape.circle),
      child: Text(
        _initials,
        style: const TextStyle(
          color: Brand.paper,
          fontFamily: Brand.fontMono,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onChanged;
  const _BottomNav({required this.index, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 62,
      child: Row(
        children: [
          // Submissions — left end (0)
          Expanded(child: _NavItem(icon: Icons.fact_check_outlined, label: 'Submit', selected: index == 0, onTap: () => onChanged(0))),
          // Census — flank (1)
          Expanded(child: _NavItem(icon: Icons.store_mall_directory_outlined, label: 'Census', selected: index == 1, onTap: () => onChanged(1))),
          // Dashboard — center, enlarged (2)
          Expanded(
            child: GestureDetector(
              onTap: () => onChanged(2),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: index == 2 ? Brand.amber : Brand.ink,
                      shape: BoxShape.circle,
                      border: Border.all(color: Brand.paper, width: 3),
                      boxShadow: [
                        BoxShadow(color: Brand.ink.withValues(alpha: 0.25), blurRadius: 8, offset: const Offset(0, 3)),
                      ],
                    ),
                    child: Icon(Icons.grid_view, color: index == 2 ? Brand.ink : Brand.paper, size: 24),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Dashboard',
                    style: TextStyle(
                      fontFamily: Brand.fontMono,
                      fontSize: 9,
                      letterSpacing: 0.05,
                      fontWeight: FontWeight.w800,
                      color: index == 2 ? Brand.ink : Brand.inkSoft,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Intercept — flank (3)
          Expanded(child: _NavItem(icon: Icons.people_outline, label: 'Intercept', selected: index == 3, onTap: () => onChanged(3))),
          // Visits — right end (4)
          Expanded(child: _NavItem(icon: Icons.store_mall_directory_outlined, label: 'Visits', selected: index == 4, onTap: () => onChanged(4))),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _NavItem({required this.icon, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: selected ? Brand.ink : Brand.inkSoft, size: 22),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontFamily: Brand.fontMono,
              fontSize: 9,
              letterSpacing: 0.05,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              color: selected ? Brand.ink : Brand.inkSoft,
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuDrawer extends StatelessWidget {
  final VoidCallback onQuickSubmission;
  final VoidCallback onQuickCensus;
  final VoidCallback onQuickIntercept;
  final VoidCallback onQuickCompetitor;
  final VoidCallback onShift;
  final VoidCallback onFieldGuide;
  final VoidCallback onTeamManagement;
  final VoidCallback onProfile;
  const _MenuDrawer({
    required this.onQuickSubmission,
    required this.onQuickCensus,
    required this.onQuickIntercept,
    required this.onQuickCompetitor,
    required this.onShift,
    required this.onFieldGuide,
    required this.onTeamManagement,
    required this.onProfile,
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Brand.paper,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      border: Border.all(color: Brand.ink, width: 2.5),
                      shape: BoxShape.circle,
                    ),
                    child: Transform.rotate(
                      angle: -0.1,
                      child: const Text('N',
                          style: TextStyle(fontFamily: Brand.fontMono, fontWeight: FontWeight.w800, color: Brand.ink)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(Brand.appName, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Brand.ink)),
                      Text('Field Rep App', style: TextStyle(color: Brand.inkSoft, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 6),
              child: Text('QUICK ACTIONS', style: TextStyle(color: Brand.inkSoft, fontFamily: Brand.fontMono, fontSize: 11, letterSpacing: 0.14)),
            ),
            _DrawerTile(icon: Icons.fact_check_outlined, label: 'Quick submission', onTap: onQuickSubmission),
            _DrawerTile(icon: Icons.storefront_outlined, label: 'Quick census', onTap: onQuickCensus),
            _DrawerTile(icon: Icons.people_outline, label: 'Quick intercept', onTap: onQuickIntercept),
            _DrawerTile(icon: Icons.local_offer_outlined, label: 'Quick competitor capture', onTap: onQuickCompetitor),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 6),
              child: Text('SHIFT', style: TextStyle(color: Brand.inkSoft, fontFamily: Brand.fontMono, fontSize: 11, letterSpacing: 0.14)),
            ),
            _DrawerTile(icon: Icons.access_time, label: 'Check-in / clock shift', onTap: onShift),
            _DrawerTile(icon: Icons.menu_book_outlined, label: 'Field guide', onTap: onFieldGuide),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 6),
              child: Text('MANAGEMENT', style: TextStyle(color: Brand.inkSoft, fontFamily: Brand.fontMono, fontSize: 11, letterSpacing: 0.14)),
            ),
            _DrawerTile(icon: Icons.group_outlined, label: 'Team management', onTap: onTeamManagement),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 6),
              child: Text('ACCOUNT', style: TextStyle(color: Brand.inkSoft, fontFamily: Brand.fontMono, fontSize: 11, letterSpacing: 0.14)),
            ),
            _DrawerTile(icon: Icons.person_outline, label: 'Profile & settings', onTap: onProfile),
            _DrawerTile(
              icon: Icons.help_outline,
              label: 'Support',
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Support: contact your route lead or the Kanini Field admin desk.')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _DrawerTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Brand.ink),
      title: Text(label, style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w600)),
      onTap: UiFx.withTap(onTap),
    );
  }
}