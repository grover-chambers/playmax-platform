import 'dart:async';
import 'dart:math' as math;
import 'package:geolocator/geolocator.dart';
import '../config/field_config.dart';

class BestFix {
  final Position pos;
  final String tier;
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
    if (cached != null && !isExpired && cached.accuracy>0 && cached.accuracy<=FieldConfig.gpsAcceptM) { _lastKnown=cached; _lastFixAt=DateTime.now(); _refreshInBackground(); return cached; }
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

  Stream<Position> watchPositionStream({LocationAccuracy accuracy=LocationAccuracy.best}) {
    return Geolocator.getPositionStream(locationSettings: LocationSettings(accuracy: accuracy, distanceFilter: 0));
  }

  Future<Position?> getBestFix({double target5m=5, double fallback8m=8, Duration stage1=const Duration(seconds:10), Duration stage2=const Duration(seconds:10)}) async {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied || perm == LocationPermission.unableToDetermine) return null;
    final completer = Completer<Position?>();
    final List<Position> fixes = [];
    StreamSubscription<Position>? sub;
    Timer? t1,t2,tGrace;
    void complete(Position? p){
      if(completer.isCompleted) return;
      completer.complete(p);
      sub?.cancel(); t1?.cancel(); t2?.cancel(); tGrace?.cancel();
    }
    void checkEarly(){
      if(fixes.length>=2){
        final a=fixes[fixes.length-1], b=fixes[fixes.length-2];
        if(a.accuracy>0 && b.accuracy>0 && a.accuracy<=target5m && b.accuracy<=target5m){
          final d=_haversineDistance(a.latitude,a.longitude,b.latitude,b.longitude);
          if(d<=5) complete(a);
        }
      }
    }
    try{
      sub = watchPositionStream(accuracy: LocationAccuracy.best).listen((pos){
        if(pos.accuracy<=0) return;
        _lastKnown=pos; _lastFixAt=DateTime.now(); fixes.add(pos); checkEarly();
      }, onError: (_){ if(!completer.isCompleted) complete(fixes.isEmpty?null:fixes.reduce((a,b)=>a.accuracy<b.accuracy?a:b)); });
    } catch(_){ return null; }

    t1 = Timer(stage1, (){
      if(completer.isCompleted) return;
      final good=fixes.where((p)=>p.accuracy<=target5m).toList();
      if(good.isNotEmpty){
        good.sort((a,b)=>a.accuracy.compareTo(b.accuracy));
        complete(good.first);
      }
    });
    t2 = Timer(stage1+stage2, (){
      if(completer.isCompleted) return;
      final good=fixes.where((p)=>p.accuracy<=fallback8m).toList();
      if(good.isNotEmpty){
        good.sort((a,b)=>a.accuracy.compareTo(b.accuracy));
        complete(good.first);
      }
    });
    tGrace = Timer(stage1+stage2+const Duration(seconds:2), (){
      if(completer.isCompleted) return;
      if(fixes.isEmpty) complete(null);
      else { fixes.sort((a,b)=>a.accuracy.compareTo(b.accuracy)); complete(fixes.first); }
    });
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
