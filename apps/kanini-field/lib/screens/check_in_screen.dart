import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';

import '../domain/typology.dart';
import '../models/retailer_model.dart';
import '../models/visit_model.dart';
import '../providers/retailer_provider.dart';
import '../services/capture_service.dart';
import '../services/location_service.dart';
import '../services/photo_service.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';

class CheckInScreen extends StatefulWidget {
  const CheckInScreen({super.key});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  final _location = LocationService();
  final _overrideController = TextEditingController();

  Retailer? _retailer;
  int _gpsFixCount = 0;
  double _gpsAccuracy = 0;
  double _distanceToOutlet = 0;
  bool _isLocked = false;
  bool _checking = false;
  String _status = 'Searching for GPS lock...';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolveRetailer());
  }

  void _resolveRetailer() {
    final args = ModalRoute.of(context)?.settings.arguments;
    final provider = context.read<RetailerProvider>();
    final retailer = args is String ? provider.byId(args) : null;
    setState(() {
      _retailer = retailer ??
          (provider.retailers.isNotEmpty ? provider.retailers.first : null);
    });
    if (_retailer != null) {
      _checkGPSLock();
    } else {
      setState(() => _status = 'No outlet selected - assign outlets first');
    }
  }

  Future<void> _checkGPSLock() async {
    if (!mounted || _isLocked) return;
    final retailer = _retailer;
    if (retailer == null) return;

    Position? position;
    try {
      position = await _location.quickFix(timeout: const Duration(seconds: 8));
    } catch (_) {
      position = null;
    }
    if (!mounted) return;
    if (position == null) {
      setState(() => _status = 'Could not acquire a GPS fix');
      return;
    }

    final accuracy = position.accuracy;
    final distance = _haversine(
      position.latitude,
      position.longitude,
      retailer.latitude,
      retailer.longitude,
    );
    _gpsFixCount++;

    setState(() {
      _gpsAccuracy = accuracy;
      _distanceToOutlet = distance;
      _isLocked = accuracy <= 5 && distance <= 5 && _gpsFixCount >= 2;
      _status = _isLocked
          ? 'GPS locked — you can check in'
          : 'Fix $_gpsFixCount: ${accuracy.toStringAsFixed(1)} m accuracy, '
              '${distance.toStringAsFixed(1)} m from outlet';
    });

    if (_isLocked) {
      UiFx.confirm();
      return;
    }
    if (_gpsFixCount < 3) {
      Future.delayed(const Duration(seconds: 1), _checkGPSLock);
    } else {
      UiFx.reject();
      setState(() => _status = 'GPS lock failed — use override to proceed');
    }
  }

  Future<void> _checkIn() async {
    final retailer = _retailer;
    if (retailer == null) return;
    setState(() => _checking = true);
    try {
      final position = await _location.quickFix(timeout: const Duration(seconds: 8));
      final overrideReason = _overrideController.text.trim();
      final useOverride = !_isLocked;
      final fallback = Position(
        latitude: retailer.latitude,
        longitude: retailer.longitude,
        accuracy: 999,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
        timestamp: DateTime.now(),
      );
      final visit = await CaptureService.instance.checkIn(
        retailer: retailer,
        position: position ?? fallback,
        accuracy: position?.accuracy,
        radiusM: 5,
        gpsVerified: useOverride ? false : _isLocked,
        verificationMethod: useOverride ? 'override' : 'gps',
        overrideReason:
            useOverride ? (overrideReason.isEmpty ? 'GPS lock failed' : overrideReason) : null,
      );
      if (!mounted) return;
      await stampIn(context, text: 'CHECK IN');
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => PhotoCaptureScreen(visit: visit)),
      );
    } catch (e) {
      UiFx.reject();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Check-in failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  double _haversine(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371000;
    final dLat = (lat2 - lat1) * 3.14159 / 180;
    final dLng = (lng2 - lng1) * 3.14159 / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * 3.14159 / 180) *
            math.cos(lat2 * 3.14159 / 180) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return r * 2 * math.asin(math.sqrt(a));
  }

  @override
  void dispose() {
    _overrideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final retailer = _retailer;
    return Scaffold(
      appBar: AppBar(title: const Text('Check In')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (retailer != null) ...[
            Text(
              retailer.name,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            Text(
              '${retailer.ward} - ${retailer.zone}',
              style: const TextStyle(color: Colors.grey),
            ),
          ],
          const SizedBox(height: 24),
          const Row(
            children: [
              Icon(Icons.gps_fixed),
              SizedBox(width: 8),
              Text('GPS Lock', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Text(_status),
          const SizedBox(height: 4),
          Text(
            'Accuracy: ${_gpsAccuracy == 0 ? 'N/A' : '${_gpsAccuracy.toStringAsFixed(1)} m'}',
          ),
          Text(
            'Distance to outlet: '
            '${_distanceToOutlet == 0 ? 'N/A' : '${_distanceToOutlet.toStringAsFixed(1)} m'}',
            style: TextStyle(
              color: _isLocked || _distanceToOutlet <= 5 ? Colors.green : Colors.red,
            ),
          ),
          const SizedBox(height: 24),
          if (!_isLocked) ...[
            const Text(
              'Cannot get a lock? Enter a reason and check in with override.',
              style: TextStyle(fontStyle: FontStyle.italic, color: Colors.orange),
            ),
            TextField(
              controller: _overrideController,
              decoration: const InputDecoration(labelText: 'Override reason'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
          ],
          _checking
              ? const Center(child: CircularProgressIndicator())
              : ElevatedButton.icon(
                  onPressed: (_isLocked || _overrideController.text.trim().isNotEmpty)
                      ? _checkIn
                      : null,
                  icon: const Icon(Icons.check),
                  label: Text(_isLocked ? 'Check In' : 'Check In with override'),
                ),
        ],
      ),
    );
  }
}

class PhotoCaptureScreen extends StatefulWidget {
  final Visit visit;
  const PhotoCaptureScreen({super.key, required this.visit});

  @override
  State<PhotoCaptureScreen> createState() => _PhotoCaptureScreenState();
}

class _PhotoCaptureScreenState extends State<PhotoCaptureScreen> {
  int _photos = 0;
  bool _capturing = false;

  Future<void> _capture(String type) async {
    setState(() => _capturing = true);
    try {
      final (path, geotag) = await PhotoService.captureWithGeotag();
      await CaptureService.instance.capturePhoto(
        visit: widget.visit,
        filePath: path,
        geotag: geotag,
        photoType: type,
      );
      if (!mounted) return;
      setState(() => _photos++);
      UiFx.tap();
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('${type.replaceAll('_', ' ')} photo queued')));
    } catch (e) {
      UiFx.reject();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Photo capture failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Capture Photos')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              '$_photos photo(s) queued. Capture a shop front and at least one '
              'shelf photo for GPS+photo verification.',
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FilledButton.icon(
                    onPressed: _capturing ? null : () => _capture('shop_front'),
                    icon: const Icon(Icons.photo),
                    label: const Text('Capture shop front'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _capturing ? null : () => _capture('shelf'),
                    icon: const Icon(Icons.inventory),
                    label: const Text('Capture shelf photo'),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _photos > 0
                    ? () {
                        UiFx.tap();
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => NotesScreen(
                              visit: widget.visit,
                              photoCount: _photos,
                            ),
                          ),
                        );
                      }
                    : null,
                child: const Text('Continue to Notes'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class NotesScreen extends StatefulWidget {
  final Visit visit;
  final int photoCount;
  const NotesScreen({super.key, required this.visit, this.photoCount = 0});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  final _notesController = TextEditingController();
  bool _saving = false;
  bool _stockCaptured = false;
  bool _orderPlaced = false;
  double _orderValue = 0;

  /// SOP: every visit ends with exactly one outcome. Null until the rep
  /// picks one; Complete Visit stays disabled until then.
  VisitOutcome? _outcome;

  Color get _outcomeStampColor => switch (_outcome!) {
        VisitOutcome.complete || VisitOutcome.partial => Brand.stampGreen,
        VisitOutcome.notAnOutlet => Brand.stampAmber,
        VisitOutcome.refused || VisitOutcome.closed || VisitOutcome.unsafe =>
          Brand.stampRed,
      };

  Future<void> _completeVisit() async {
    setState(() => _saving = true);
    await CaptureService.instance.checkOut(
      widget.visit,
      notes: _notesController.text.trim(),
      stockCaptured: _stockCaptured,
      orderPlaced: _orderPlaced,
      orderValue: _orderPlaced ? _orderValue : null,
      photoCount: widget.photoCount,
      outcome: _outcome!.code,
    );
    if (!mounted) return;
    final stampText = _outcome!.label.toUpperCase();
    final stampColor = _outcomeStampColor;
    UiFx.stamp();
    await stampIn(context, text: stampText, color: stampColor);
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Visit saved - will sync when online')));
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _stockDialog() async {
    final skuCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    final priceCtrl = TextEditingController(text: '0');
    var shelf = 'full';

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Stock Observation'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: skuCtrl,
                  decoration: const InputDecoration(labelText: 'SKU', hintText: 'e.g. MAIZE-2KG'),
                ),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Product name'),
                ),
                TextField(
                  controller: qtyCtrl,
                  decoration: const InputDecoration(labelText: 'Quantity'),
                  keyboardType: TextInputType.number,
                ),
                TextField(
                  controller: priceCtrl,
                  decoration: const InputDecoration(labelText: 'Price (KES)'),
                  keyboardType: TextInputType.number,
                ),
                DropdownButtonFormField<String>(
                  initialValue: shelf,
                  decoration: const InputDecoration(labelText: 'Shelf level'),
                  items: const [
                    DropdownMenuItem(value: 'full', child: Text('Full')),
                    DropdownMenuItem(value: 'half', child: Text('Half')),
                    DropdownMenuItem(value: 'low', child: Text('Low')),
                    DropdownMenuItem(value: 'out', child: Text('Out of stock')),
                  ],
                  onChanged: (v) => setDialogState(() => shelf = v ?? 'full'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                UiFx.confirm();
                Navigator.pop(ctx, {
                  'sku': skuCtrl.text.trim(),
                  'name': nameCtrl.text.trim(),
                  'qty': int.tryParse(qtyCtrl.text) ?? 0,
                  'shelf': shelf,
                  'price': double.tryParse(priceCtrl.text) ?? 0,
                });
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );

    if (result != null) {
      await CaptureService.instance.addStockObservation(
        visit: widget.visit,
        sku: result['sku'] as String,
        name: result['name'] as String?,
        qty: result['qty'] as int,
        shelf: result['shelf'] as String,
        price: result['price'] as double,
      );
      if (mounted) {
        setState(() => _stockCaptured = true);
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Stock observation queued')));
      }
    }
  }

  Future<void> _competitorDialog() async {
    final brandCtrl = TextEditingController();
    final productCtrl = TextEditingController();
    final priceCtrl = TextEditingController(text: '0');
    var shelfPresence = 'full_facing';
    var activity = 'promo';

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Competitor Observation'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: brandCtrl,
                  decoration: const InputDecoration(labelText: 'Brand', hintText: 'e.g. Pembe'),
                ),
                TextField(
                  controller: productCtrl,
                  decoration: const InputDecoration(labelText: 'Product name'),
                ),
                TextField(
                  controller: priceCtrl,
                  decoration: const InputDecoration(labelText: 'Price (KES)'),
                  keyboardType: TextInputType.number,
                ),
                DropdownButtonFormField<String>(
                  initialValue: shelfPresence,
                  decoration: const InputDecoration(labelText: 'Shelf presence'),
                  items: const [
                    DropdownMenuItem(value: 'full_facing', child: Text('Full facing')),
                    DropdownMenuItem(value: 'half_facing', child: Text('Half facing')),
                    DropdownMenuItem(value: 'shelf_edge', child: Text('Shelf edge')),
                    DropdownMenuItem(value: 'none', child: Text('None')),
                  ],
                  onChanged: (v) => setDialogState(() => shelfPresence = v ?? 'full_facing'),
                ),
                DropdownButtonFormField<String>(
                  initialValue: activity,
                  decoration: const InputDecoration(labelText: 'Activity'),
                  items: const [
                    DropdownMenuItem(value: 'promo', child: Text('Promo')),
                    DropdownMenuItem(value: 'price-drop', child: Text('Price drop')),
                    DropdownMenuItem(value: 'new-listing', child: Text('New listing')),
                    DropdownMenuItem(value: 'stockout', child: Text('Stockout')),
                    DropdownMenuItem(value: 'shelf-share', child: Text('Shelf share')),
                  ],
                  onChanged: (v) => setDialogState(() => activity = v ?? 'promo'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                UiFx.confirm();
                Navigator.pop(ctx, {
                  'brand': brandCtrl.text.trim(),
                  'product_name': productCtrl.text.trim(),
                  'price': double.tryParse(priceCtrl.text) ?? 0,
                  'shelf_presence': shelfPresence,
                  'activity': activity,
                });
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );

    if (result != null) {
      await CaptureService.instance.addCompetitorObservation(
        visit: widget.visit,
        brand: result['brand'] as String,
        productName: result['product_name'] as String?,
        price: result['price'] as double,
        shelfPresence: result['shelf_presence'] as String,
        activity: result['activity'] as String,
      );
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Competitor observation queued')));
      }
    }
  }

  Future<void> _orderDialog() async {
    final skuCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    final priceCtrl = TextEditingController(text: '0');
    final items = <Map<String, dynamic>>[];

    final result = await showDialog<List<Map<String, dynamic>>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Order Intent'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: skuCtrl,
                  decoration: const InputDecoration(labelText: 'SKU', hintText: 'e.g. MAIZE-2KG'),
                ),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Product name'),
                ),
                TextField(
                  controller: qtyCtrl,
                  decoration: const InputDecoration(labelText: 'Quantity'),
                  keyboardType: TextInputType.number,
                ),
                TextField(
                  controller: priceCtrl,
                  decoration: const InputDecoration(labelText: 'Unit price (KES)'),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    UiFx.tap();
                    setDialogState(() {
                      items.add({
                        'sku': skuCtrl.text.trim(),
                        'name': nameCtrl.text.trim(),
                        'quantity': int.tryParse(qtyCtrl.text) ?? 1,
                        'price': double.tryParse(priceCtrl.text) ?? 0,
                      });
                      skuCtrl.clear();
                      nameCtrl.clear();
                      qtyCtrl.text = '1';
                      priceCtrl.text = '0';
                    });
                  },
                  child: const Text('+ Add item'),
                ),
                if (items.isNotEmpty)
                  Text('${items.length} item(s) added', style: const TextStyle(fontSize: 12)),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: items.isEmpty
                  ? null
                  : () {
                      UiFx.confirm();
                      Navigator.pop(ctx, List<Map<String, dynamic>>.from(items));
                    },
              child: const Text('Place Order'),
            ),
          ],
        ),
      ),
    );

    if (result != null && result.isNotEmpty) {
      await CaptureService.instance.placeOrder(visit: widget.visit, items: result);
      if (mounted) {
        setState(() {
          _orderPlaced = true;
          _orderValue = result.fold<double>(
            0,
            (sum, it) => sum +
                ((it['price'] as num).toDouble() * (it['quantity'] as num).toDouble()),
          );
        });
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Order queued - will be forwarded')));
      }
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Visit Notes')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Add visit notes:',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(
              hintText: 'e.g. Out of stock on Rice, customer busy',
            ),
            maxLines: 3,
          ),
          const SizedBox(height: 24),
          const Text('Capture intel:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () {
                  UiFx.tap();
                  _stockDialog();
                },
                icon: const Icon(Icons.inventory),
                label: Text(_stockCaptured ? 'Stock saved' : 'Add stock'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  UiFx.tap();
                  _competitorDialog();
                },
                icon: const Icon(Icons.bar_chart),
                label: const Text('Competitor'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  UiFx.tap();
                  _orderDialog();
                },
                icon: const Icon(Icons.shopping_cart),
                label: Text(_orderPlaced ? 'Order placed' : 'Place order'),
              ),
            ],
          ),
          const SizedBox(height: 32),
          const Text('Outcome:',
              style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          const Text(
            'Every visit gets exactly one outcome.',
            style: TextStyle(fontSize: 12, color: Colors.black54),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final o in VisitOutcome.values)
                ChoiceChip(
                  label: Text(o.label),
                  selected: _outcome == o,
                  onSelected: (_) {
                    UiFx.tap();
                    setState(() => _outcome = o);
                  },
                ),
            ],
          ),
          if (_outcome != null) ...[
            const SizedBox(height: 8),
            Text(
              _outcome!.description,
              style: const TextStyle(fontSize: 12.5, color: Colors.black54),
            ),
          ],
          const SizedBox(height: 32),
          _saving
              ? const Center(child: CircularProgressIndicator())
              : ElevatedButton.icon(
                  onPressed:
                      _outcome == null ? null : _completeVisit,
                  icon: const Icon(Icons.check),
                  label: const Text('Complete Visit'),
                ),
        ],
      ),
    );
  }
}
