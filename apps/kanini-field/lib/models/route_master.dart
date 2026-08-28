class RouteMaster {
  final String id;
  final String name;
  final String groupName;
  final String leadEmail;
  final String repEmail;
  final String? sourceRep;
  final String? sourceContact;
  final double travelKm;
  final double tonnageTarget;
  final String? orderDays;
  final String? deliveryDays;
  final String? vehicle;
  final String? driver;
  final bool active;

  const RouteMaster({
    required this.id,
    required this.name,
    required this.groupName,
    required this.leadEmail,
    required this.repEmail,
    this.sourceRep,
    this.sourceContact,
    this.travelKm = 0,
    this.tonnageTarget = 0,
    this.orderDays,
    this.deliveryDays,
    this.vehicle,
    this.driver,
    this.active = true,
  });

  factory RouteMaster.fromJson(Map<String, dynamic> json) => RouteMaster(
        id: json['id'] as String,
        name: json['name'] as String,
        groupName: json['group_name'] as String,
        leadEmail: json['lead_email'] as String,
        repEmail: json['rep_email'] as String,
        sourceRep: json['source_rep'] as String?,
        sourceContact: json['source_contact'] as String?,
        travelKm: (json['travel_km'] as num?)?.toDouble() ?? 0,
        tonnageTarget: (json['tonnage_target'] as num?)?.toDouble() ?? 0,
        orderDays: json['order_days'] as String?,
        deliveryDays: json['delivery_days'] as String?,
        vehicle: json['vehicle'] as String?,
        driver: json['driver'] as String?,
        active: json['active'] as bool? ?? true,
      );
}
