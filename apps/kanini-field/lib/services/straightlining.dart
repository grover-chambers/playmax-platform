/// STRAIGHTLINING DETECTOR — §5 quality control.
///
/// Straightlining is the signature of falsified or rushed field work: an
/// enumerator taps the same answer for every outlet (same brands present, same
/// purchase frequency, same household size) because it is faster than reading
/// the shelf. Detecting it requires only the data already collected.
class StraightlineHit {
  final String field;
  final String value;
  final int runLength;
  final List<String> recordIds;

  const StraightlineHit({
    required this.field,
    required this.value,
    required this.runLength,
    required this.recordIds,
  });
}

class StraightliningDetector {
  /// Scan a list of records (already as JSON maps) for fields whose values
  /// are identical across [threshold] or more *consecutive* records.
  ///
  /// Only non-empty values are considered, and multi-select fields (lists)
  /// are compared as sets so ordering differences do not false-positive.
  static List<StraightlineHit> detect(
    List<Map<String, dynamic>> records, {
    List<String> fields = const [
      'purchase_frequency',
      'household_size',
      'channel_context',
      'brands_present',
      'storage_capacity',
      'delivery_or_collect',
    ],
    int threshold = 5,
  }) {
    final hits = <StraightlineHit>[];
    if (records.length < threshold) return hits;

    for (final field in fields) {
      var runStart = 0;
      while (runStart < records.length) {
        final v = _fingerprint(records[runStart][field]);
        if (v == null) {
          runStart++;
          continue;
        }
        var runEnd = runStart + 1;
        while (runEnd < records.length &&
            _fingerprint(records[runEnd][field]) == v) {
          runEnd++;
        }
        final runLength = runEnd - runStart;
        if (runLength >= threshold) {
          hits.add(StraightlineHit(
            field: field,
            value: v.length > 80 ? '${v.substring(0, 80)}…' : v,
            runLength: runLength,
            recordIds: records
                .sublist(runStart, runEnd)
                .map((r) => r['id']?.toString() ?? '?')
                .toList(),
          ));
        }
        runStart = runEnd;
      }
    }
    return hits;
  }

  /// Normalise a value: lists become sorted joined strings, everything else
  /// becomes a trimmed string. Null / empty -> null (skipped).
  static String? _fingerprint(dynamic value) {
    if (value == null) return null;
    if (value is List) {
      if (value.isEmpty) return null;
      final sorted = value.map((e) => e.toString().trim()).toList()..sort();
      return sorted.join('|');
    }
    final s = value.toString().trim();
    return s.isEmpty ? null : s;
  }
}
