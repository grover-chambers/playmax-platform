import 'package:flutter_test/flutter_test.dart';

import 'package:niceos_app/models/user_model.dart';
import 'package:niceos_app/models/visit_model.dart';

void main() {
  group('UserModel', () {
    test('fromJson round-trips through toJson', () {
      final json = {
        'id': 'u1',
        'email': 'rep@nice.ke',
        'name': 'Brayo',
        'role': 'rep',
        'zone': 'Nairobi',
        'profile_photo': null,
        'created_at': '2026-08-01T10:00:00.000Z',
        'updated_at': '2026-08-01T10:00:00.000Z',
        'last_login_at': null,
        'is_active': true,
      };
      final user = UserModel.fromJson(json);
      expect(user.id, 'u1');
      expect(user.role, 'rep');
      expect(user.zone, 'Nairobi');
      expect(user.isActive, isTrue);
      expect(UserModel.fromJson(user.toJson()).name, 'Brayo');
    });
  });

  group('Visit', () {
    test('fromJson applies defaults for missing optional fields', () {
      final visit = Visit.fromJson({
        'id': 'v1',
        'outlet_id': 'r1',
        'retailer_id': 'r1',
        'rep_id': 'rep1',
        'user_id': 'u1',
        'check_in_at': '2026-08-13T09:00:00.000Z',
        'gps_lat': -1.2833,
        'gps_lng': 36.8167,
        'created_at': '2026-08-13T09:00:00.000Z',
        'updated_at': '2026-08-13T09:00:00.000Z',
      });
      expect(visit.outletName, '');
      expect(visit.radiusM, 5);
      expect(visit.gpsVerified, isFalse);
      expect(visit.outcome, 'COMPLETE');
      expect(visit.durationMin, 0);
      expect(visit.notes, isNull);
    });

    test('toJson round-trips optional values', () {
      final visit = Visit.fromJson({
        'id': 'v1',
        'outlet_id': 'r1',
        'outlet_name': 'Nice Mart',
        'retailer_id': 'r1',
        'rep_id': 'rep1',
        'user_id': 'u1',
        'check_in_at': '2026-08-13T09:00:00.000Z',
        'check_out_at': '2026-08-13T09:30:00.000Z',
        'gps_lat': -1.2833,
        'gps_lng': 36.8167,
        'gps_accuracy': 4.5,
        'radius_m': 5,
        'gps_verified': true,
        'verification_method': 'gps+photo',
        'verification_source': 'gps',
        'outcome': 'completed',
        'duration_min': 30,
        'stock_captured': true,
        'photo_count': 2,
        'order_placed': true,
        'order_value': 1200.0,
        'notes': 'Nice day',
        'created_at': '2026-08-13T09:00:00.000Z',
        'updated_at': '2026-08-13T09:30:00.000Z',
      });
      expect(visit.isConfirmed, isTrue);
      expect(visit.durationMin, 30);
      expect(visit.orderValue, 1200.0);
      expect(Visit.fromJson(visit.toJson()).notes, 'Nice day');
    });
  });
}
