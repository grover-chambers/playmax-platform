import 'dart:convert';
import 'package:flutter/services.dart';

class WardService {
  List<Map<String,dynamic>> _features=[];
  bool _loaded=false;
  Future<void> load() async {
    if(_loaded) return;
    try{
      final s = await rootBundle.loadString('assets/geo/wards.geojson');
      final j = jsonDecode(s);
      _features = List<Map<String,dynamic>>.from(j['features']??[]);
    }catch(_){
      try{
        final s2 = await rootBundle.loadString('assets/geo/territory_wards.json');
        final j2 = jsonDecode(s2);
        if(j2 is Map && j2['features']!=null) _features = List<Map<String,dynamic>>.from(j2['features']);
      }catch(_){}
    }
    _loaded=true;
  }
  String? wardFor(double lat,double lng){
    for(final f in _features){
      final geom=f['geometry']; if(geom==null) continue;
      if(geom['type']=='Polygon'){
        final coords=(geom['coordinates'][0] as List).map((c)=> [ (c[0] as num).toDouble(), (c[1] as num).toDouble()]).toList();
        if(_pointInPolygon(lng,lat,coords)) return f['properties']?['ward']?.toString() ?? f['properties']?['name']?.toString();
      }
      if(geom['type']=='MultiPolygon'){
        for(final poly in geom['coordinates']){
          final coords=(poly[0] as List).map((c)=> [ (c[0] as num).toDouble(), (c[1] as num).toDouble()]).toList();
          if(_pointInPolygon(lng,lat,coords)) return f['properties']?['ward']?.toString() ?? f['properties']?['name']?.toString();
        }
      }
    }
    return null;
  }
  bool _pointInPolygon(double x,double y, List<List<double>> vs){
    bool inside=false;
    for(int i=0,j=vs.length-1;i<vs.length;j=i++){
      final xi=vs[i][0], yi=vs[i][1], xj=vs[j][0], yj=vs[j][1];
      if(((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside;
    }
    return inside;
  }
  double distanceToNearestM(double lat,double lng){ return 0; }
}
final wardService=WardService();
