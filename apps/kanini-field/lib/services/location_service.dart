import 'dart:async';
import 'dart:math' as math;
import 'package:geolocator/geolocator.dart';
import '../config/field_config.dart';

class BestFix {
  final Position pos;
  final String tier; // high/medium/manual
  final String source;
  BestFix(this.pos,this.tier,this.source);
}

class LocationService {
  LocationService();
  Position? _lastKnown;
  DateTime? _lastFixAt;
  Position? get lastFix => _lastKnown;
  DateTime? get lastFixAt => _lastFixAt;
  bool get isExpired => _lastFixAt==null || DateTime.now().difference(_lastFixAt!).inMinutes>5;

  Future<Position?> getCurrentPosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) { await Geolocator.openLocationSettings(); return null; }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.deniedForever) return null;
    if (permission != LocationPermission.whileInUse && permission != LocationPermission.always) return null;
    final cached = await Geolocator.getLastKnownPosition();
    if (cached != null) { _lastKnown=cached; _lastFixAt=DateTime.now(); _refreshInBackground(); return cached; }
    try { final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high, timeLimit: const Duration(seconds:10)); _lastKnown=pos; _lastFixAt=DateTime.now(); return pos; } catch(_){ return _lastKnown; }
  }
  void _refreshInBackground() async {
    try{ final pos=await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high,timeLimit: const Duration(seconds:8)); _lastKnown=pos; _lastFixAt=DateTime.now(); }catch(_){}
  }
  Future<Position?> quickFix({Duration timeout=const Duration(seconds:8)}) async {
    final cached=await Geolocator.getLastKnownPosition();
    if(cached!=null && cached.accuracy<=FieldConfig.gpsAcceptM){ _lastKnown=cached; _lastFixAt=DateTime.now(); return cached; }
    try{ final pos=await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high,timeLimit: timeout); _lastKnown=pos; _lastFixAt=DateTime.now(); return pos; }catch(_){ return _lastKnown; }
  }

  // --- new dual-GPS helpers ---
  Stream<Position> watchPositionStream({LocationAccuracy accuracy=LocationAccuracy.best}) {
    return Geolocator.getPositionStream(locationSettings: LocationSettings(accuracy: accuracy, distanceFilter: 0));
  }

  Future<Position?> getBestFix({double target5m=5, double fallback8m=8, Duration stage1=const Duration(seconds:10), Duration stage2=const Duration(seconds:10)}) async {
    final completer=Completer<Position?>();
    final List<Position> fixes=[];
    late StreamSubscription sub;
    Timer? t1,t2;
    void check(){
      // need 2 fixes <= target and <=5m apart
      final good=fixes.where((p)=>p.accuracy<=target5m).toList();
      if(good.length>=2){
        final d=_haversineDistance(good[good.length-1].latitude, good[good.length-1].longitude, good[good.length-2].latitude, good[good.length-2].longitude);
        if(d<=5){ if(!completer.isCompleted) completer.complete(good.last); sub.cancel(); t1?.cancel(); t2?.cancel(); }
      }
    }
    sub=watchPositionStream(accuracy: LocationAccuracy.best).listen((pos){
      _lastKnown=pos; _lastFixAt=DateTime.now(); fixes.add(pos); check();
      // stage2 fallback: any <=8m
      if(!completer.isCompleted && DateTime.now().difference(fixes.first.timestamp).inSeconds>10){
        final fallback=fixes.where((p)=>p.accuracy<=fallback8m);
        if(fallback.isNotEmpty && DateTime.now().difference(fixes.first.timestamp).inSeconds>=20){
          // will complete via timer
        }
      }
    });
    t1=Timer(stage1, (){
      // relax check already in stream; nothing
    });
    t2=Timer(stage1+stage2, (){
      if(!completer.isCompleted){
        final fallback=fixes.where((p)=>p.accuracy<=fallback8m);
        if(fallback.isNotEmpty) completer.complete(fallback.last);
        else if(fixes.isNotEmpty) completer.complete(fixes.reduce((a,b)=>a.accuracy<b.accuracy?a:b));
        else completer.complete(null);
        sub.cancel();
      }
    });
    // also timeout if permission denied etc - add try
    return completer.future;
  }

  Future<(double lat,double lng)?> stabiliseFixes({int minSamples=3,int maxSeconds=15}) async {
    final List<Position> fixes=[]; final start=DateTime.now();
    while(DateTime.now().difference(start).inSeconds<maxSeconds){
      final remaining=maxSeconds-DateTime.now().difference(start).inSeconds;
      final fix=await quickFix(timeout: Duration(seconds: math.min(8, remaining>0?remaining:1)));
      if(fix!=null){ fixes.add(fix); if(fixes.length>=minSamples){
          final avgLat=fixes.map((f)=>f.latitude).reduce((a,b)=>a+b)/fixes.length;
          final avgLng=fixes.map((f)=>f.longitude).reduce((a,b)=>a+b)/fixes.length;
          final maxRadius=fixes.map((f)=>_haversineDistance(f.latitude,f.longitude,avgLat,avgLng)).reduce((a,b)=>a>b?a:b);
          if(maxRadius<=FieldConfig.gpsStabiliseToleranceM) return (avgLat,avgLng);
        } }
      await Future.delayed(const Duration(seconds:1));
    }
    return null;
  }
  Future<LocationPermission> checkPermission() async => await Geolocator.checkPermission();
  Future<double?> getLastAccuracy() async => (await Geolocator.getLastKnownPosition())?.accuracy;
  bool hasValidGps(double lat,double lng)=> lat>=-5 && lat<=5 && lng>=33 && lng<=43;
  double _haversineDistance(double lat1,double lng1,double lat2,double lng2){
    const R=6371000; final dLat=(lat2-lat1)*3.14159/180; final dLng=(lng2-lng1)*3.14159/180;
    final a=math.sin(dLat/2)*math.sin(dLat/2)+math.cos(lat1*3.14159/180)*math.cos(lat2*3.14159/180)*math.sin(dLng/2)*math.sin(dLng/2);
    return 2*R*math.asin(math.sqrt(a));
  }
}
final LocationService locationService=LocationService();
