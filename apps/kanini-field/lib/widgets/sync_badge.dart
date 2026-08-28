import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/sync_provider.dart';
import '../ui_fx.dart';

/// Live sync affordance for the shell app bar: a cloud that swells and pulses
/// while a flush is in flight, a red pending-count bubble, and a tap that
/// forces an immediate sync.
class SyncBadge extends StatefulWidget {
  const SyncBadge({super.key});

  @override
  State<SyncBadge> createState() => _SyncBadgeState();
}

class _SyncBadgeState extends State<SyncBadge> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 750),
    lowerBound: 0.9,
    upperBound: 1.15,
  );

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncProvider>();

    if (sync.isSyncing && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    } else if (!sync.isSyncing && _pulse.isAnimating) {
      _pulse.stop();
      _pulse.value = 1.0;
    }

    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          icon: ScaleTransition(
            scale: _pulse,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: Icon(
                sync.isSyncing
                    ? Icons.cloud_sync
                    : (sync.pendingCount > 0 ? Icons.cloud_upload : Icons.cloud_done),
                key: ValueKey(sync.isSyncing),
              ),
            ),
          ),
          onPressed: () {
            UiFx.tap();
            context.read<SyncProvider>().forceSync();
          },
          tooltip: 'Sync now',
        ),
        if (sync.pendingCount > 0)
          Positioned(
            right: 0,
            top: 0,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.4, end: 1),
              duration: const Duration(milliseconds: 350),
              curve: Curves.elasticOut,
              builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                child: Text(
                  '${sync.pendingCount}',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.amber[700],
      padding: const EdgeInsets.all(8.0),
      child: const Row(
        children: [
          Icon(Icons.wifi_off, color: Colors.white),
          SizedBox(width: 8),
          Text(
            'Offline mode - data will sync when online',
            style: TextStyle(color: Colors.white),
          ),
        ],
      ),
    );
  }
}

class GPSSLockIndicator extends StatelessWidget {
  final bool isLocked;
  const GPSSLockIndicator({super.key, required this.isLocked});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      color: isLocked ? Colors.green : Colors.red,
      child: Text(
        isLocked ? 'GPS Locked' : 'Searching...',
        style: const TextStyle(color: Colors.white, fontSize: 12),
      ),
    );
  }
}