/// FIELD CONFIG — single source for every tunable the SOP calls a business
/// decision. Bundled defaults for V1; later served by NAMPARK `/mobile/config`.
/// Nothing here may be re-hardcoded at call sites.
class FieldConfig {
  FieldConfig._();

  // ---- App identity (user-facing) ----
  static const String appName = 'Kanini Field';
  static const String company = 'Kanini Haraka';

  // ---- GPS discipline (provisional; validate against field readings) ----
  static const double gpsAcceptM = 15; // <= ACCEPT
  static const double gpsWarnM = 40; // 15–40 WARN/WAIT/MOVE, > REJECT
  static const int gpsStabiliseSamples = 3;
  static const int gpsStabiliseSeconds = 15;
  static const double gpsStabiliseToleranceM = 10;

  // ---- Visit quality gates (mirrors SOP §5; feeds QualityService) ----
  static const double proximityRadiusM = 50;
  static const Duration minVisitDuration = Duration(minutes: 4);
  static const double backCheckFraction = 0.1;

  // ---- Daily target ----
  static const int dailyTargetOutlets = 30;
  static const int dailyTargetBandMin = 20;
  static const int dailyTargetBandMax = 40;
  static const int workingDaysPerWeek = 6; // Mon–Sat

  /// Field-day rhythm (local times). Current block is derived from clock time.
  static const List<FieldBlock> dayRhythm = [
    FieldBlock('07:00', 'Sign in at the centre', Duration(minutes: 15)),
    FieldBlock('07:15', 'Morning brief', Duration(minutes: 30)),
    FieldBlock('07:45', 'Depart to beat', Duration(minutes: 15)),
    FieldBlock('08:00', 'Field block one', Duration(hours: 4, minutes: 30)),
    FieldBlock('12:30', 'Break', Duration(minutes: 45)),
    FieldBlock('13:15', 'Field block two', Duration(hours: 3, minutes: 15)),
    FieldBlock('16:30', 'Return to centre', Duration(minutes: 15)),
    FieldBlock('16:45', 'Sync window', Duration(minutes: 15)),
    FieldBlock('17:00', 'Debrief', Duration(minutes: 30)),
    FieldBlock('17:30', 'Close day', Duration.zero),
  ];

  // ---- Safety escalation (contacts NOT YET PROVISIONED — never invent
  // numbers; UI shows "number pending" until these are filled) ----
  static const SafetyContact safetyClusterLead =
      SafetyContact('Cluster lead', null);
  static const SafetyContact safetyOpsLead = SafetyContact('Laban', null);
  static const SafetyContact safetyDeviceSupport1 =
      SafetyContact('Ian', null);
  static const SafetyContact safetyDeviceSupport2 =
      SafetyContact('Brian', null);

  /// Provisioned when every contact has a number.
  static bool get safetyContactsReady =>
      [safetyClusterLead, safetyOpsLead, safetyDeviceSupport1, safetyDeviceSupport2]
          .every((c) => c.phone != null);
}

class FieldBlock {
  final String start; // HH:mm local
  final String label;
  final Duration duration;

  const FieldBlock(this.start, this.label, this.duration);

  DateTime? startOn(DateTime day) {
    final p = start.split(':');
    if (p.length != 2) return null;
    return DateTime(
        day.year, day.month, day.day, int.parse(p[0]), int.parse(p[1]));
  }

  DateTime? endOn(DateTime day) =>
      startOn(day)?.add(duration);
}

class SafetyContact {
  final String name;
  final String? phone;

  const SafetyContact(this.name, this.phone);
}
