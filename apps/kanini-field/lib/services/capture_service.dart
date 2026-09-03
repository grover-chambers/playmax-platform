import 'dart:io';

import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../domain/typology.dart';
import '../models/competitor_observation_model.dart';
import '../models/order_intent_model.dart';
import '../models/retailer_model.dart';
import '../models/shelf_photo_model.dart';
import '../models/stock_observation_model.dart';
import '../models/visit_model.dart';
import 'supabase_service.dart';
import 'sync_service.dart';

/// Field capture: builds visit / stock / competitor / order / photo rows
/// offline-first and stages them in the local sync queue. Nothing is written
/// to the server directly — every row flows through `sync-push`.
class CaptureService {
  CaptureService._();

  static final CaptureService instance = CaptureService._();

  static const _uuid = Uuid();

  String? _profileId;

  String get userId => Supabase.instance.client.auth.currentUser?.id ?? '';

  /// The rep's profile id. `reps.id` == `profiles.id`, so this doubles as the
  /// `rep_id` / `created_by` used by every synced row.
  Future<String> profileId() async {
    if (_profileId != null && _profileId!.isNotEmpty) return _profileId!;
    final u = userId;
    if (u.isEmpty) return '';
    final res = await Supabase.instance.client
        .from('profiles')
        .select('id')
        .eq('auth_id', u)
        .maybeSingle();
    _profileId = res == null ? u : (res['id'] as String);
    return _profileId!;
  }

  Future<Visit> checkIn({
    required Retailer retailer,
    required Position position,
    double? accuracy,
    int radiusM = 5,
    bool gpsVerified = false,
    String verificationMethod = 'gps',
    String? overrideReason,
  }) async {
    final now = DateTime.now().toUtc();
    final repId = await profileId();
    final visit = Visit(
      id: _uuid.v4(),
      outletId: retailer.id,
      outletName: retailer.name,
      retailerId: retailer.id,
      repId: repId,
      userId: userId,
      checkInAt: now,
      gpsLat: position.latitude,
      gpsLng: position.longitude,
      gpsAccuracy: accuracy,
      radiusM: radiusM,
      gpsVerified: gpsVerified,
      verificationMethod: verificationMethod,
      verificationSource: verificationMethod,
      outcome: VisitOutcome.complete.code,
      notes: '',
      overrideReason: overrideReason,
      createdAt: now,
      updatedAt: now,
    );
    await syncService.enqueueSync('visits', visit.id, visit.toJson());
    return visit;
  }

  /// Close out a visit: check_out_at, notes and flags. Same row id with a
  /// newer `updated_at` — the server applies last-write-wins.
  Future<void> checkOut(
    Visit visit, {
    String notes = '',
    bool stockCaptured = false,
    bool orderPlaced = false,
    double? orderValue,
    int photoCount = 0,

    /// SOP outcome code (VisitOutcome). Null keeps the existing value —
    /// callers in the Kanini flow must always pass a validated one.
    String? outcome,
  }) async {
    final now = DateTime.now().toUtc();
    final updated = Visit(
      id: visit.id,
      outletId: visit.outletId,
      outletName: visit.outletName,
      retailerId: visit.retailerId,
      repId: visit.repId,
      userId: visit.userId,
      checkInAt: visit.checkInAt,
      checkOutAt: now,
      gpsLat: visit.gpsLat,
      gpsLng: visit.gpsLng,
      gpsAccuracy: visit.gpsAccuracy,
      radiusM: visit.radiusM,
      gpsVerified: visit.gpsVerified,
      verificationMethod: visit.verificationMethod,
      verificationSource: visit.verificationSource,
      outcome: (outcome != null && VisitOutcome.fromCode(outcome) != null)
          ? outcome
          : visit.outcome,
      durationMin: now.difference(visit.checkInAt).inMinutes,
      stockCaptured: stockCaptured,
      photoCount: photoCount,
      orderPlaced: orderPlaced,
      orderValue: orderValue,
      notes: notes,
      overrideReason: visit.overrideReason,
      createdAt: visit.createdAt,
      updatedAt: now,
    );
    await syncService.enqueueSync('visits', visit.id, updated.toJson());
  }

  /// Stage a photo metadata row and upload the binary when possible.
  /// Upload is fire-and-forget with retry — the metadata row may land before
  /// the object, and the dashboard renders a placeholder until it exists
  /// (sync contract §5).
  Future<ShelfPhoto> capturePhoto({
    required Visit visit,
    required String filePath,
    required Map<String, dynamic> geotag,
    String photoType = 'shop_front',
  }) async {
    final now = DateTime.now().toUtc();
    final photo = ShelfPhoto(
      id: _uuid.v4(),
      visitId: visit.id,
      retailerId: visit.retailerId,
      repId: visit.repId,
      filePath: filePath,
      photoType: photoType,
      lat: geotag['latitude']?.toString() ?? '',
      lng: geotag['longitude']?.toString() ?? '',
      accuracy: (geotag['accuracy'] as num?)?.toDouble(),
      capturedAt: now,
      createdBy: visit.repId,
      createdAt: now,
      updatedAt: now,
    );
    await syncService.enqueueSync('shelf_photos', photo.id, photo.toJson());
    // Push the binary now; if the device is offline (or storage upload fails)
    // record it in the pending-media queue so a later sync pass retries it
    // instead of silently losing the image. The metadata row stays queued
    // until the binary is confirmed (see SyncProvider.flush).
    final ok = await _uploadPhoto(photo);
    if (!ok) {
      await syncService.enqueuePendingMedia(
        entity: 'shelf_photos',
        rowId: photo.id,
        filePath: photo.filePath,
        repId: photo.repId,
      );
    }
    return photo;
  }

  /// Returns true only when the binary is confirmed on storage. On any failure
  /// the caller is expected to keep a pending-media record for retry.
  Future<bool> _uploadPhoto(ShelfPhoto photo) async {
    try {
      final file = File(photo.filePath);
      if (!await file.exists()) return false;
      final bytes = await file.readAsBytes();
      await SupabaseService.instance.uploadShelfPhoto(photo.repId, photo.id, bytes);
      return true;
    } catch (_) {
      // Offline or permission failure — binary will be retried via the
      // pending-media queue.
      return false;
    }
  }

  Future<void> addStockObservation({
    required Visit visit,
    required String sku,
    String? name,
    int qty = 0,
    String shelf = 'full',
    double price = 0,
  }) async {
    final now = DateTime.now().toUtc();
    final obs = StockObservationModel(
      id: _uuid.v4(),
      visitId: visit.id,
      retailerId: visit.retailerId,
      repId: visit.repId,
      sku: sku,
      name: name ?? '',
      qty: qty,
      shelf: shelf,
      price: price,
      capturedAt: now,
      createdBy: visit.repId,
      createdAt: now,
      updatedAt: now,
    );
    await syncService.enqueueSync('stock_observations', obs.id, obs.toJson());
  }

  Future<void> addCompetitorObservation({
    required Visit visit,
    required String brand,
    String? productName,
    double price = 0,
    String shelfPresence = 'none',
    String activity = 'promo',
    bool promotionActive = false,
    String? note,
  }) async {
    final now = DateTime.now().toUtc();
    final obs = CompetitorObservationModel(
      id: _uuid.v4(),
      retailerId: visit.retailerId,
      repId: visit.repId,
      visitId: visit.id,
      brand: brand,
      productName: productName ?? '',
      price: price,
      shelfPresence: shelfPresence,
      activity: activity,
      promotionActive: promotionActive,
      note: note ?? '',
      at: now,
      createdAt: now,
      updatedAt: now,
    );
    await syncService.enqueueSync('competitor_observations', obs.id, obs.toJson());
  }

  /// Place an order intent header + line items. Parents precede children in
  /// the queue so `sync-push` applies them in the right order.
  Future<void> placeOrder({
    required Visit visit,
    required List<Map<String, dynamic>> items,
  }) async {
    final now = DateTime.now().toUtc();
    final orderId = _uuid.v4();
    final total = items.fold<double>(
      0,
      (sum, it) =>
          sum + ((it['price'] as num).toDouble() * (it['quantity'] as num).toDouble()),
    );
    final order = OrderIntentModel(
      id: orderId,
      retailerId: visit.retailerId,
      repId: visit.repId,
      createdBy: visit.repId,
      total: total,
      forwardStatus: 'pending',
      items: const [],
      createdAt: now,
      updatedAt: now,
    );
    await syncService.enqueueSync('order_intents', orderId, order.toJson());
    for (final item in items) {
      final itemModel = OrderIntentItemModel(
        id: _uuid.v4(),
        orderIntentId: orderId,
        sku: item['sku'] as String,
        name: (item['name'] as String?) ?? '',
        quantity: (item['quantity'] as num?)?.toInt() ?? 1,
        price: (item['price'] as num?)?.toDouble() ?? 0,
        createdAt: now,
      );
      await syncService.enqueueSync('order_intent_items', itemModel.id, itemModel.toJson());
    }
  }

  /// Mark a route stop as visited so the dashboard can compute route progress.
  Future<void> markStopVisited(String stopId) async {
    final now = DateTime.now().toUtc();
    await syncService.enqueueSync('route_stops', stopId, {
      'id': stopId,
      'visited': true,
      'visited_at': now.toIso8601String(),
      'updated_at': now.toIso8601String(),
    });
  }
}
