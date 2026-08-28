import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/route_master.dart';

/// Loads routes from `routes_master` for the current user.
/// Dual-role: a user sees routes where they are the rep OR the cluster lead.
/// Territory managers and super admins see ALL routes (management view).
class RouteMasterProvider extends ChangeNotifier {
  List<RouteMaster> _routes = [];
  bool _loading = false;
  String? _error;

  List<RouteMaster> get routes => _routes;
  bool get loading => _loading;
  String? get error => _error;

  /// Routes grouped by group_name, preserving insertion order.
  Map<String, List<RouteMaster>> get byGroup {
    final map = <String, List<RouteMaster>>{};
    for (final r in _routes) {
      map.putIfAbsent(r.groupName, () => []).add(r);
    }
    return map;
  }

  /// The cluster lead email(s) for routes the current user leads.
  Set<String> get leadGroups {
    final email = Supabase.instance.client.auth.currentUser?.email;
    if (email == null) return {};
    return _routes
        .where((r) => r.leadEmail == email)
        .map((r) => r.groupName)
        .toSet();
  }

  /// True if the current user is a cluster lead for any group.
  bool get isClusterLead => leadGroups.isNotEmpty;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final client = Supabase.instance.client;
      final email = client.auth.currentUser?.email;
      if (email == null) {
        _error = 'Not signed in';
        _loading = false;
        notifyListeners();
        return;
      }

      // Check user role to decide query scope
      final profile = await client
          .from('profiles')
          .select('role')
          .eq('auth_id', client.auth.currentUser!.id)
          .maybeSingle();
      final role = profile?['role'] as String?;

      List<dynamic> data;
      if (role == 'super_admin' || role == 'territory_manager') {
        // Management view: see all routes
        data = await client
            .from('routes_master')
            .select()
            .eq('active', true)
            .order('group_name')
            .order('name');
      } else {
        // Field rep: see routes where you're the rep OR the lead
        data = await client
            .from('routes_master')
            .select()
            .eq('active', true)
            .or('rep_email.eq.$email,lead_email.eq.$email')
            .order('group_name')
            .order('name');
      }

      _routes = data.map((j) => RouteMaster.fromJson(j)).toList();
    } catch (e) {
      _error = e.toString();
    }
    _loading = false;
    notifyListeners();
  }
}
