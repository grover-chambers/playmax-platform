import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

class PhotoService {
  PhotoService();

  /// Capture a photo from the camera and tag it with the current GPS fix.
  /// Returns `(file path, geotag metadata)`.
  ///
  /// image_picker handles camera permission requests on Android 6+ natively.
  /// If the user denies the permission, the picker returns null and we throw
  /// a clear error message.
  static Future<(String, Map<String, dynamic>)> captureWithGeotag({
    ImageSource source = ImageSource.camera,
  }) async {
    // 1. Get GPS fix (fast — use cache first)
    Position? position;
    try {
      final cached = await Geolocator.getLastKnownPosition();
      if (cached != null && cached.accuracy <= 20) {
        position = cached;
      }
      position ??= await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (_) {
      // GPS failure — photo still captured, just without accurate geotag
    }

    // 2. Open camera (image_picker requests CAMERA permission on Android)
    final file = await ImagePicker().pickImage(source: source, maxWidth: 2048);
    if (file == null) {
      throw Exception('Photo cancelled — grant camera permission in Settings if needed');
    }

    // 3. Build geotag. When GPS fails we emit NULL coords (NOT 0.0) so the
    //    row is clearly ungeotagged and can never render as a (0,0) pin.
    final hasFix = position != null && (position.latitude != 0.0 || position.longitude != 0.0);
    final geotag = {
      'latitude': hasFix ? position.latitude : null,
      'longitude': hasFix ? position.longitude : null,
      'accuracy': hasFix ? position.accuracy : null,
      'timestamp': DateTime.now().toIso8601String(),
    };
    return (file.path, geotag);
  }
}

final PhotoService photoService = PhotoService();
