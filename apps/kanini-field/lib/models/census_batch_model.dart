enum BatchStatus {
  draft,
  ready,
  submitting,
  submitted,
  syncing,
  synced,
  partial,
  failed,
}

class CensusBatchModel {
  final String id;
  final String repId;
  final String deviceId;
  final String batchNumber; // e.g. KL-20260907-001
  final DateTime startedAt;
  final DateTime? submittedAt;
  final DateTime? syncedAt;
  final int recordCount;
  final List<String> qualityFlags;
  final BatchStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CensusBatchModel({
    required this.id,
    required this.repId,
    required this.deviceId,
    required this.batchNumber,
    required this.startedAt,
    this.submittedAt,
    this.syncedAt,
    this.recordCount = 0,
    this.qualityFlags = const [],
    this.status = BatchStatus.draft,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CensusBatchModel.fromJson(Map<String, dynamic> json) {
    return CensusBatchModel(
      id: json['id'] as String,
      repId: json['rep_id'] as String,
      deviceId: json['device_id'] as String,
      batchNumber: json['batch_number'] as String,
      startedAt: DateTime.parse(json['started_at'] as String),
      submittedAt: json['submitted_at'] != null
          ? DateTime.parse(json['submitted_at'] as String)
          : null,
      syncedAt: json['synced_at'] != null
          ? DateTime.parse(json['synced_at'] as String)
          : null,
      recordCount: json['record_count'] as int? ?? 0,
      qualityFlags: List<String>.from(json['quality_flags'] ?? []),
      status: BatchStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => BatchStatus.draft,
      ),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rep_id': repId,
      'device_id': deviceId,
      'batch_number': batchNumber,
      'started_at': startedAt.toIso8601String(),
      'submitted_at': submittedAt?.toIso8601String(),
      'synced_at': syncedAt?.toIso8601String(),
      'record_count': recordCount,
      'quality_flags': qualityFlags,
      'status': status.name,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  CensusBatchModel copyWith({
    int? recordCount,
    BatchStatus? status,
    DateTime? submittedAt,
    DateTime? syncedAt,
    List<String>? qualityFlags,
  }) {
    return CensusBatchModel(
      id: id,
      repId: repId,
      deviceId: deviceId,
      batchNumber: batchNumber,
      startedAt: startedAt,
      submittedAt: submittedAt ?? this.submittedAt,
      syncedAt: syncedAt ?? this.syncedAt,
      recordCount: recordCount ?? this.recordCount,
      qualityFlags: qualityFlags ?? this.qualityFlags,
      status: status ?? this.status,
      createdAt: createdAt,
      updatedAt: DateTime.now().toUtc(),
    );
  }

  static String generateBatchNumber(String repName, int count) {
    final date = DateTime.now();
    final ds = "${date.year}${date.month.toString().padLeft(2, '0')}${date.day.toString().padLeft(2, '0')}";
    final prefix = repName.length >= 2 ? repName.substring(0, 2).toUpperCase() : "XX";
    return "$prefix-$ds-${count.toString().padLeft(3, '0')}";
  }
}
