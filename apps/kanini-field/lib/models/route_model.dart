class RouteModel {
  final String id;
  final String date;
  final String repId;
  final String zone;
  final String status;
  final double totalKm;
  final int totalTravelMin;
  final String? startTime;
  final String? endTime;
  final String createdBy;
  final String revisedBy;
  final String? revisedReason;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;
  final List<RouteStopModel> stops;

  RouteModel({
    required this.id,
    required this.date,
    required this.repId,
    required this.zone,
    required this.status,
    this.totalKm = 0,
    this.totalTravelMin = 0,
    this.startTime,
    this.endTime,
    required this.createdBy,
    required this.revisedBy,
    this.revisedReason,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
    this.stops = const [],
  });

  factory RouteModel.fromJson(Map<String, dynamic> json) {
    var stopsJson = json['stops'] as List?;
    return RouteModel(
      id: json['id'] as String,
      date: json['date'] as String,
      repId: json['rep_id'] as String,
      zone: json['zone'] as String,
      status: json['status'] as String? ?? 'draft',
      totalKm: json['total_km'] != null ? (json['total_km'] as num).toDouble() : 0,
      totalTravelMin: json['total_travel_min'] != null
          ? (json['total_travel_min'] as num).toInt()
          : 0,
      startTime: json['start_time'] as String?,
      endTime: json['end_time'] as String?,
      createdBy: json['created_by'] as String? ?? '',
      revisedBy: json['revised_by'] as String? ?? '',
      revisedReason: json['revised_reason'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
      stops: stopsJson != null
          ? stopsJson.map((s) => RouteStopModel.fromJson(s)).toList()
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date,
      'rep_id': repId,
      'zone': zone,
      'status': status,
      'total_km': totalKm,
      'total_travel_min': totalTravelMin,
      'start_time': startTime,
      'end_time': endTime,
      'created_by': createdBy,
      'revised_by': revisedBy,
      'revised_reason': revisedReason,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
      'stops': stops.map((s) => s.toJson()).toList(),
    };
  }
}

class RouteStopModel {
  final String id;
  final String routeId;
  final String retailerId;
  final int position;
  final String? plannedStart;
  final String? plannedEnd;
  final String visitType;
  final double kmFromPrev;
  final int minutesFromPrev;
  final bool visited;
  final DateTime? visitedAt;
  final String priority;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  RouteStopModel({
    required this.id,
    required this.routeId,
    required this.retailerId,
    required this.position,
    this.plannedStart,
    this.plannedEnd,
    this.visitType = 'retail',
    this.kmFromPrev = 0,
    this.minutesFromPrev = 0,
    this.visited = false,
    this.visitedAt,
    this.priority = 'medium',
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  factory RouteStopModel.fromJson(Map<String, dynamic> json) {
    return RouteStopModel(
      id: json['id'] as String,
      routeId: json['route_id'] as String,
      retailerId: json['retailer_id'] as String,
      position: json['position'] as int? ?? 1,
      plannedStart: json['planned_start'] as String?,
      plannedEnd: json['planned_end'] as String?,
      visitType: json['visit_type'] as String? ?? 'retail',
      kmFromPrev: json['km_from_prev'] != null
          ? (json['km_from_prev'] as num).toDouble()
          : 0,
      minutesFromPrev: json['minutes_from_prev'] != null
          ? (json['minutes_from_prev'] as num).toInt()
          : 0,
      visited: json['visited'] as bool? ?? false,
      visitedAt: json['visited_at'] != null
          ? DateTime.parse(json['visited_at'] as String)
          : null,
      priority: json['priority'] as String? ?? 'medium',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'route_id': routeId,
      'retailer_id': retailerId,
      'position': position,
      'planned_start': plannedStart,
      'planned_end': plannedEnd,
      'visit_type': visitType,
      'km_from_prev': kmFromPrev,
      'minutes_from_prev': minutesFromPrev,
      'visited': visited,
      'visited_at': visitedAt?.toIso8601String(),
      'priority': priority,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'deleted_at': deletedAt?.toIso8601String(),
    };
  }
}