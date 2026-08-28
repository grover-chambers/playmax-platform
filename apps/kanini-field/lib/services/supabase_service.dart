import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  SupabaseService._();

  static final SupabaseService instance = SupabaseService._();

  late final SupabaseClient client;

  Future<void> init() async {
    client = Supabase.instance.client;
  }

  // Auth
  Future<AuthResponse> signInWithEmailAndPassword(String email, String password) {
    return client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signOut() => client.auth.signOut();

  User? get currentUser => client.auth.currentUser;

  // Sync edge functions (see docs/api-contracts/sync.md)
  Future<dynamic> pushSync({
    required String deviceId,
    required List<Map<String, dynamic>> batch,
  }) async {
    final response = await client.functions.invoke('sync-push', body: {
      'device_id': deviceId,
      'batch': batch,
    });
    return response.data;
  }

  Future<dynamic> pullSync({String? since, List<String>? entities}) async {
    final response = await client.functions.invoke(
      'sync-pull',
      method: HttpMethod.get,
      queryParameters: {
        if (since != null) 'since': since,
        'entities': (entities ?? []).join(','),
      },
    );
    return response.data;
  }

  // Reads (scoped by RLS to the signed-in rep)
  Future<List<Map<String, dynamic>>> getRetailers() async {
    final res = await client.from('retailers').select();
    return _toMaps(res);
  }

  Future<List<Map<String, dynamic>>> getRoutes() async {
    final res = await client.from('routes').select();
    return _toMaps(res);
  }

  Future<List<Map<String, dynamic>>> getRouteStops() async {
    final res = await client.from('route_stops').select();
    return _toMaps(res);
  }

  Future<List<Map<String, dynamic>>> getHealthScores() async {
    final res = await client.from('health_scores').select();
    return _toMaps(res);
  }

  // Storage (bucket is private; RLS restricts a rep to their own prefix)
  Future<String> uploadShelfPhoto(String repId, String photoId, Uint8List bytes) async {
    final path = '$repId/$photoId.jpg';
    await client.storage
        .from('shelf-photos')
        .uploadBinary(path, bytes, fileOptions: const FileOptions(upsert: true));
    return path;
  }

  Future<String> getPhotoSignedUrl(String path) async {
    return client.storage.from('shelf-photos').createSignedUrl(path, 3600);
  }

  List<Map<String, dynamic>> _toMaps(dynamic res) {
    if (res is List) {
      return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return const [];
  }
}
