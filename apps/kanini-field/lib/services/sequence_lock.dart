/// SURVEY_SEQUENCE_LOCK — §4.6 enforced in code, never by training.
///
/// In an intercept, [ConsumerInterceptModel.unaidedBrandsAware] must be
/// captured BEFORE any aided brand list is shown to the respondent. If the
/// aided list is revealed first, the unaided answers are worthless — the whole
/// purpose of the unaided question is to measure top-of-mind awareness.
///
/// The lock is a state machine the UI drives: the aided list is only ever
/// shown through [revealAidedList], and [check] refuses to save the intercept
/// if the list was revealed before the unaided answer was recorded.
class SequenceLockViolation implements Exception {
  final String message;
  const SequenceLockViolation(this.message);

  @override
  String toString() => 'SequenceLockViolation: $message';
}

class SurveySequenceLock {
  List<String> _unaided = [];
  bool _unaidedRecorded = false;
  bool _aidedRevealed = false;
  List<String> _aided = [];

  /// Record the unaided answers. Must happen before the aided list is shown.
  void recordUnaided(List<String> brands) {
    _unaided = List<String>.of(brands);
    _unaidedRecorded = true;
  }

  /// Called by the UI at the exact moment the aided brand list is rendered.
  void revealAidedList() {
    if (!_unaidedRecorded) {
      _aidedRevealed = true; // violation flagged at save time
    }
  }

  void recordAided(List<String> brands) {
    _aided = List<String>.of(brands);
  }

  List<String> get unaided => List.unmodifiable(_unaided);
  List<String> get aided => List.unmodifiable(_aided);
  bool get unaidedRecorded => _unaidedRecorded;

  /// Throws [SequenceLockViolation] if the aided list was shown before the
  /// unaided answer existed.
  void check() {
    if (_aidedRevealed) {
      throw const SequenceLockViolation(
          'Aided brand list was shown before the unaided answer was captured.');
    }
    if (!_unaidedRecorded) {
      throw const SequenceLockViolation('Unaided awareness answer is required.');
    }
  }
}
