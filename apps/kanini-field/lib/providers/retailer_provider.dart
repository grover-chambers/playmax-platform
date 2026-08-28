import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/retailer_model.dart';

class RetailerProvider extends ChangeNotifier {
  RetailerProvider();

  SupabaseClient? _client;
  List<Retailer> _retailers = [];
  Retailer? _currentRetailer;

  List<Retailer> get retailers => List.unmodifiable(_retailers);
  Retailer? get currentRetailer => _currentRetailer;

  set currentRetailer(Retailer? retailer) {
    _currentRetailer = retailer;
    notifyListeners();
  }

  Retailer? byId(String id) {
    for (final r in _retailers) {
      if (r.id == id) return r;
    }
    return null;
  }

  Future<void> loadRetailers() async {
    try {
      final client = _client ??= Supabase.instance.client;
      final response = await client.from('retailers').select();
      _retailers = (response as List)
          .map((r) => Retailer.fromJson(Map<String, dynamic>.from(r as Map)))
          .toList();
      notifyListeners();
    } catch (_) {
      // RLS scopes retailers to the signed-in rep; ignore empty/denied reads.
    }
  }

  Future<void> addRetailer(Retailer retailer) async {
    try {
      final client = _client ??= Supabase.instance.client;
      await client.from('retailers').insert(retailer.toJson());
      _retailers.add(retailer);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> updateRetailer(Retailer retailer) async {
    try {
      final client = _client ??= Supabase.instance.client;
      await client.from('retailers').update(retailer.toJson()).eq('id', retailer.id);
      final index = _retailers.indexWhere((r) => r.id == retailer.id);
      if (index != -1) {
        _retailers[index] = retailer;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> deleteRetailer(String id) async {
    try {
      final client = _client ??= Supabase.instance.client;
      await client.from('retailers').delete().eq('id', id);
      _retailers.removeWhere((r) => r.id == id);
      notifyListeners();
    } catch (_) {}
  }
}