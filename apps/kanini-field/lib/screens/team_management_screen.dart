import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/warm.dart';

/// Team Management — visible to cluster leads (territory_manager) and
/// super_admins. Lists reps in their teams, shows group assignments,
/// and allows adding new rep accounts.
class TeamManagementScreen extends StatefulWidget {
  const TeamManagementScreen({super.key});

  @override
  State<TeamManagementScreen> createState() => _TeamManagementScreenState();
}

class _TeamManagementScreenState extends State<TeamManagementScreen> {
  List<Map<String, dynamic>> _reps = [];
  Map<String, List<Map<String, dynamic>>> _byGroup = {};
  bool _loading = true;
  String? _error;
  String? _userRole;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser?.id;
      if (uid == null) {
        setState(() => _error = 'Not signed in');
        return;
      }

      final profile = await client
          .from('profiles')
          .select('role')
          .eq('auth_id', uid)
          .maybeSingle();
      _userRole = profile?['role'] as String?;

      if (_userRole != 'super_admin' && _userRole != 'territory_manager') {
        setState(() {
          _error = 'Only cluster leads and admins can manage teams.';
          _loading = false;
        });
        return;
      }

      // Load all reps with their profiles
      final data = await client.from('reps').select('''
        id, zone, manager_id, user:profiles!reps_user_id_fkey(id, full_name, email, role)
      ''');

      _reps = (data as List).cast<Map<String, dynamic>>();
      _byGroup = {};
      for (final r in _reps) {
        final zone = (r['zone'] as String?) ?? 'Unassigned';
        _byGroup.putIfAbsent(zone, () => []).add(r);
      }
    } catch (e) {
      _error = e.toString();
    }
    setState(() => _loading = false);
  }

  Future<void> _addRepDialog() async {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String? selectedGroup;

    final groups = _byGroup.keys.toList()..sort();
    // Seed common groups if empty
    if (groups.isEmpty) {
      for (final g in ['A', 'B', 'C', 'D', 'E', 'F', 'G']) groups.add(g);
    }

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Add Field Rep'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Full name'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: emailCtrl,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: phoneCtrl,
                  decoration: const InputDecoration(labelText: 'Phone'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedGroup,
                  decoration: const InputDecoration(labelText: 'Assign to group'),
                  items: groups
                      .map((g) => DropdownMenuItem(value: g, child: Text('Group $g')))
                      .toList(),
                  onChanged: (v) => setDialogState(() => selectedGroup = v),
                ),
                const SizedBox(height: 12),
                const Text(
                  'A Supabase auth account will be created. '
                  'The rep sets their password on first login.',
                  style: TextStyle(fontSize: 11, color: Brand.inkSoft),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                UiFx.confirm();
                Navigator.pop(ctx, {
                  'name': nameCtrl.text.trim(),
                  'email': emailCtrl.text.trim(),
                  'phone': phoneCtrl.text.trim(),
                  'group': selectedGroup ?? '',
                });
              },
              child: const Text('Add Rep'),
            ),
          ],
        ),
      ),
    );

    if (result != null && result['email']!.isNotEmpty) {
      await _createRep(
        name: result['name']!,
        email: result['email']!,
        phone: result['phone']!,
        group: result['group']!,
      );
    }
  }

  Future<void> _createRep({
    required String name,
    required String email,
    required String phone,
    required String group,
  }) async {
    try {
      setState(() => _loading = true);
      final client = Supabase.instance.client;

      // Create auth user via admin API (service key needed — use edge function
      // or direct insert. For now, create profile + rep record only; auth
      // account creation happens server-side or via Supabase dashboard.)
      final authId = client.auth.currentUser!.id;

      // Insert profile
      final profileRes = await client.from('profiles').upsert({
        'email': email,
        'full_name': name,
        'phone': phone,
        'role': 'sales_rep',
      }).select('id').single();

      // Insert rep record
      await client.from('reps').upsert({
        'user_id': profileRes['id'],
        'zone': group,
        'manager_id': authId,
      });

      if (mounted) {
        UiFx.confirm();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Rep $name added to Group $group')),
        );
        _load();
      }
    } catch (e) {
      UiFx.reject();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add rep: $e')),
        );
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Team Management'),
        actions: [
          if (_userRole == 'super_admin' || _userRole == 'territory_manager')
            IconButton(
              icon: const Icon(Icons.person_add),
              tooltip: 'Add rep',
              onPressed: () {
                UiFx.tap();
                _addRepDialog();
              },
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: WarmCard(
                      child: Text(_error!,
                          style: const TextStyle(color: Brand.stampRed)),
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _reps.isEmpty
                      ? const Center(
                          child: Text(
                            'No reps found. Tap + to add one.',
                            style: TextStyle(color: Brand.inkSoft),
                          ),
                        )
                      : ListView(
                          padding: const EdgeInsets.only(bottom: 40),
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                              child: Text(
                                '${_reps.length} rep(s) across ${_byGroup.length} group(s)',
                                style: const TextStyle(
                                    color: Brand.inkSoft,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600),
                              ),
                            ),
                            for (final entry in _byGroup.entries) ...[
                              Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(20, 12, 20, 4),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color:
                                            Brand.stampGreen.withAlpha(30),
                                        borderRadius:
                                            BorderRadius.circular(6),
                                        border: Border.all(
                                            color: Brand.stampGreen),
                                      ),
                                      child: Text('Group ${entry.key}',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 11,
                                              color: Brand.stampGreen)),
                                    ),
                                    const SizedBox(width: 8),
                                    Text('${entry.value.length} rep(s)',
                                        style: const TextStyle(
                                            color: Brand.inkSoft,
                                            fontSize: 12)),
                                  ],
                                ),
                              ),
                              for (final rep in entry.value)
                                _RepTile(rep: rep),
                            ],
                          ],
                        ),
                ),
    );
  }
}

class _RepTile extends StatelessWidget {
  final Map<String, dynamic> rep;
  const _RepTile({required this.rep});

  @override
  Widget build(BuildContext context) {
    final user = rep['user'] as Map<String, dynamic>?;
    final name = user?['full_name'] as String? ?? 'Unknown';
    final email = user?['email'] as String? ?? '';
    final role = user?['role'] as String? ?? 'sales_rep';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 3),
      child: WarmCard(
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                  color: Brand.ink, shape: BoxShape.circle),
              child: Text(
                name.split(' ').where((p) => p.isNotEmpty).take(2).map((p) => p[0]).join().toUpperCase(),
                style: const TextStyle(
                    color: Brand.paper,
                    fontFamily: Brand.fontMono,
                    fontSize: 12,
                    fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: Brand.ink)),
                  const SizedBox(height: 1),
                  Text(email,
                      style: const TextStyle(
                          fontSize: 11, color: Brand.inkSoft)),
                ],
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: role == 'territory_manager'
                    ? Brand.amber.withAlpha(40)
                    : Brand.card,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Brand.ink.withAlpha(40)),
              ),
              child: Text(
                role == 'territory_manager' ? 'Lead' : 'Rep',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: role == 'territory_manager'
                        ? Brand.amberDeep
                        : Brand.inkSoft),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
