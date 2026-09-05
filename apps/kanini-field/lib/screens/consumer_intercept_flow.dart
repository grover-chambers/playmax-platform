import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../domain/typology.dart';
import '../providers/auth_provider.dart';
import '../providers/intercept_provider.dart';
import '../services/intercept_service.dart';
import '../services/location_service.dart';
import '../services/quality_service.dart';
import '../services/sequence_lock.dart';
import '../ui_fx.dart';
import '../widgets/form_controls.dart';

/// CONSUMER INTERCEPT FLOW — §4.6. Anonymous by design; the aided brand list
/// is gated behind [SurveySequenceLock] so unaided awareness is always
/// captured first. A GPS fix is required before the intercept can be saved.
class ConsumerInterceptFlow extends StatefulWidget {
  /// Injectable for tests; defaults to the real [LocationService].
  final LocationService? location;

  const ConsumerInterceptFlow({super.key, this.location});

  @override
  State<ConsumerInterceptFlow> createState() => _ConsumerInterceptFlowState();
}

class _ConsumerInterceptFlowState extends State<ConsumerInterceptFlow> {
  final _draft = InterceptDraft();
  final _lock = SurveySequenceLock();

  late final LocationService _location = widget.location ?? LocationService();

  int _step = 0;
  bool _busy = false;
  String? _gpsStatus = 'No GPS fix yet';

  // Unaided capture is free text (no list on screen).
  final _unaidedController = TextEditingController();
  final List<String> _unaidedBrands = [];
  bool _aidedRevealed = false;

  static const _householdBands = ['1–2', '3–4', '5+', '6+'];

  final _aidedFlour = <String>{};
  final _aidedDairy = <String>{};

  static const _aidedFlourLabels = ['Nice', 'Jogoo (Unga)', 'Pembe', 'Soko (Capwell)',
      'Dola', 'Ndovu', 'Amaize', 'Unbranded / posho'];
  static const _aidedDairyLabels = ['Brookside', 'New KCC', 'Fresha (Githunguri)',
      'Daima', 'Ilara', 'Tuzo', 'Lato', 'Raw / unbranded'];

  @override
  void dispose() {
    _unaidedController.dispose();
    super.dispose();
  }

  Future<void> _acquireGps() async {
    setState(() {
      _busy = true;
      _gpsStatus = 'Acquiring GPS…';
    });
    final fix = await _location.getCurrentPosition();
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (fix != null && qualityService.gateGps(fix.accuracy) == null) {
        _draft.gpsFix = fix;
        _gpsStatus = 'Fix locked (${fix.accuracy.toStringAsFixed(1)} m accuracy)';
        UiFx.confirm();
      } else if (fix != null) {
        _gpsStatus =
            'Fix too weak (${fix.accuracy.toStringAsFixed(1)} m) — move to open sky.';
        UiFx.reject();
      } else {
        _gpsStatus = 'Could not get a fix — enable location services and retry.';
        UiFx.reject();
      }
    });
  }

  void _addUnaided() {
    final v = _unaidedController.text.trim();
    if (v.isEmpty) return;
    UiFx.tap();
    setState(() {
      _unaidedBrands.add(v);
      _unaidedController.clear();
      _lock.recordUnaided(List.of(_unaidedBrands));
    });
  }

  void _revealAided() {
    UiFx.confirm();
    setState(() {
      _aidedRevealed = true;
      _lock.revealAidedList();
    });
  }

  String? _validate(int step) {
    switch (step) {
      case 0:
        if (_draft.ward.trim().isEmpty) return 'Ward is required.';
        if (_draft.gpsFix == null) return 'Acquire a GPS fix first.';
        if (qualityService.gateGps(_draft.gpsFix!.accuracy) != null) {
          return 'GPS accuracy must be ≤ 15 m. Move to open sky and retry.';
        }
        return null;
      case 1:
        if (!_draft.consentAgreed) return 'Consent is required.';
        return null;
      case 2:
        if (_draft.householdSizeBand == null) return 'Household size is required.';
        if (_draft.shopperRoleCode == null) return 'Shopper role is required.';
        return null;
      case 3:
        if (_unaidedBrands.isEmpty) return 'Capture at least one unaided brand first.';
        if (!_aidedRevealed) return 'Ask the aided questions before continuing.';
        return null;
      default:
        return null;
    }
  }

  void _next() {
    final err = _validate(_step);
    if (err != null) {
      UiFx.reject();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      return;
    }
    UiFx.tap();
    setState(() => _step++);
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    // Fail closed: only reachable when authenticated — never fall back to a
    // fake rep id.
    final auth = context.read<AuthProvider>();
    final repId = auth.currentUser != null ? await auth.profileId() : null;
    if (repId == null) {
      setState(() => _busy = false);
      throw StateError('Not authenticated — sign in before submitting an intercept.');
    }
    _lock.recordAided([..._aidedFlour, ..._aidedDairy]);
    try {
      await context.read<InterceptProvider>().submit(
            draft: _draft,
            lock: _lock,
            repId: repId,
          );
      if (!mounted) return;
      UiFx.stamp();
      await stampIn(context, text: 'INTERCEPT SAVED');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Intercept saved')),
      );
      Navigator.of(context).pop(true);
    } on InterceptRejectedException catch (e) {
      UiFx.reject();
      if (!mounted) return;
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Intercept rejected'),
          content: Text(e.message),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
          ],
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Consumer Intercept')),
      body: Stepper(
        currentStep: _step,
        onStepTapped: (s) {
          if (s <= _step) setState(() => _step = s);
        },
        controlsBuilder: (context, details) {
          final last = _step == 5;
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(
              children: [
                if (_step > 0)
                  OutlinedButton(
                    onPressed: () {
                      UiFx.tap();
                      setState(() => _step--);
                    },
                    child: const Text('Back'),
                  ),
                const SizedBox(width: 12),
                if (!last)
                  FilledButton(onPressed: _busy ? null : _next, child: const Text('Next'))
                else
                  FilledButton.icon(
                    onPressed: _busy ? null : _submit,
                    icon: _busy
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.check),
                    label: const Text('Submit Intercept'),
                  ),
              ],
            ),
          );
        },
        steps: [
          Step(title: const Text('Location'), isActive: _step >= 0, content: _locationStep()),
          Step(title: const Text('Consent'), isActive: _step >= 1, content: _consentStep()),
          Step(title: const Text('Shopper'), isActive: _step >= 2, content: _shopperStep()),
          Step(title: const Text('Awareness'), isActive: _step >= 3, content: _awarenessStep()),
          Step(title: const Text('Purchase'), isActive: _step >= 4, content: _purchaseStep()),
          Step(title: const Text('Review'), isActive: _step >= 5, content: _reviewStep()),
        ],
      ),
    );
  }

  Widget _locationStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'GPS fix (required)', children: [
          FilledButton.tonalIcon(
            onPressed: _busy ? null : _acquireGps,
            icon: const Icon(Icons.my_location),
            label: const Text('Acquire GPS fix'),
          ),
          const SizedBox(height: 8),
          Text(_gpsStatus ?? '', style: const TextStyle(color: Colors.grey)),
        ]),
        SectionCard(title: 'Where are you intercepting?', children: [
          TextField(
            decoration: const InputDecoration(labelText: 'Ward *'),
            onChanged: (v) => setState(() => _draft.ward = v),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<Channel>(
            label: 'Channel context',
            options: Channel.values,
            labelFor: (c) => c.label,
            value: Channel.fromCode(_draft.channelContextCode),
            onChanged: (v) => setState(() => _draft.channelContextCode = v?.code ?? 'traditional'),
          ),
        ]),
      ],
    );
  }

  Widget _consentStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionCard(title: 'Read the script aloud', children: [
          ConsentScript(variant: 'intercept'),
        ]),
        SectionCard(title: 'Consent', children: [
          CheckboxListTile(
            title: const Text('Respondent agreed to take part'),
            value: _draft.consentAgreed,
            onChanged: (v) => setState(() => _draft.consentAgreed = v ?? false),
            controlAffinity: ListTileControlAffinity.leading,
          ),
        ]),
      ],
    );
  }

  Widget _shopperStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'Household', children: [
          ChipMultiSelect(
            title: 'Household size',
            codes: _householdBands,
            labels: _householdBands,
            selected: {if (_draft.householdSizeBand != null) _draft.householdSizeBand!},
            onChanged: (s) => setState(() =>
                _draft.householdSizeBand = s.isEmpty ? null : s.first),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<ShopperRole>(
            label: 'Shopper role',
            options: ShopperRole.values,
            labelFor: (r) => r.label,
            value: ShopperRole.fromCode(_draft.shopperRoleCode),
            onChanged: (v) => setState(() => _draft.shopperRoleCode = v?.code),
          ),
        ]),
        SectionCard(title: 'Weekly basket', children: [
          ChipMultiSelect(
            title: 'Categories bought weekly',
            codes: ProductCategory.values.map((c) => c.code).toList(),
            labels: ProductCategory.values.map((c) => c.label).toList(),
            selected: _draft.categoriesBoughtWeekly.toSet(),
            onChanged: (s) => setState(() => _draft.categoriesBoughtWeekly = s.toList()),
          ),
        ]),
      ],
    );
  }

  Widget _awarenessStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_aidedRevealed) ...[
          SectionCard(
            title: 'Unaided — do NOT show a list',
            subtitle: 'Ask: "Which flour and milk brands can you name right '
                'now, without thinking?" Type their answers below.',
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _unaidedController,
                      decoration: const InputDecoration(
                        labelText: 'Brand name',
                        hintText: 'e.g. Pembe',
                      ),
                      onSubmitted: (_) => _addUnaided(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _addUnaided,
                    icon: const Icon(Icons.add_circle),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_unaidedBrands.isEmpty)
                const Text('No brands named yet.',
                    style: TextStyle(color: Colors.grey))
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final b in _unaidedBrands) Chip(label: Text(b)),
                  ],
                ),
            ],
          ),
          FilledButton.icon(
            onPressed: _unaidedBrands.isEmpty
                ? null
                : _revealAided,
            icon: const Icon(Icons.lock_open),
            label: const Text('Show the aided brand list'),
          ),
        ] else ...[
          SectionCard(
            title: 'Aided — now read the list',
            subtitle: 'Read each brand and ask which the respondent is aware of.',
            children: [
              const Text('Flour brands',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ChipMultiSelect(
                title: '',
                codes: _aidedFlourLabels,
                labels: _aidedFlourLabels,
                selected: _aidedFlour,
                onChanged: (s) => setState(() => _aidedFlour
                  ..clear()
                  ..addAll(s)),
              ),
              const SizedBox(height: 12),
              const Text('Milk / dairy brands',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ChipMultiSelect(
                title: '',
                codes: _aidedDairyLabels,
                labels: _aidedDairyLabels,
                selected: _aidedDairy,
                onChanged: (s) => setState(() => _aidedDairy
                  ..clear()
                  ..addAll(s)),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _purchaseStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'Current usage', children: [
          LabeledDropdown<FlourBrand>(
            label: 'Flour brand used now',
            options: FlourBrand.values,
            labelFor: (b) => b.label,
            value: FlourBrand.values.where((b) => b.label == _draft.flourBrandUsedNow).firstOrNull,
            onChanged: (v) => setState(() => _draft.flourBrandUsedNow = v?.label),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<DairyBrand>(
            label: 'Milk brand used now',
            options: DairyBrand.values,
            labelFor: (b) => b.label,
            value: DairyBrand.values.where((b) => b.label == _draft.milkBrandUsedNow).firstOrNull,
            onChanged: (v) => setState(() => _draft.milkBrandUsedNow = v?.label),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<PackSize>(
            label: 'Pack size preferred',
            options: PackSize.values,
            labelFor: (p) => p.label,
            value: PackSize.fromCode(_draft.packSizePreferred),
            onChanged: (v) => setState(() => _draft.packSizePreferred = v?.code),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<PurchaseFrequency>(
            label: 'Purchase frequency',
            options: PurchaseFrequency.values,
            labelFor: (f) => f.label,
            value: PurchaseFrequency.fromCode(_draft.purchaseFrequencyCode),
            onChanged: (v) => setState(() => _draft.purchaseFrequencyCode = v?.code),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<WhereTheyBuy>(
            label: 'Where they buy',
            options: WhereTheyBuy.values,
            labelFor: (w) => w.label,
            value: WhereTheyBuy.fromCode(_draft.whereTheyBuyCode),
            onChanged: (v) => setState(() => _draft.whereTheyBuyCode = v?.code),
          ),
          const SizedBox(height: 12),
          NumberField(
            label: 'Last price paid (KES)',
            onChanged: (v) => setState(() => _draft.pricePaidLast = v),
          ),
        ]),
        SectionCard(title: 'Switching behaviour', children: [
          LabeledDropdown<SwitchTrigger>(
            label: 'What would make them switch?',
            options: SwitchTrigger.values,
            labelFor: (t) => t.label,
            value: SwitchTrigger.fromCode(_draft.switchTriggerCode),
            onChanged: (v) => setState(() => _draft.switchTriggerCode = v?.code),
          ),
          const SizedBox(height: 12),
          NumberField(
            label: 'Max acceptable price (KES)',
            onChanged: (v) => setState(() => _draft.maxAcceptablePrice = v),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<WouldTryNewBrand>(
            label: 'Would they try a new brand?',
            options: WouldTryNewBrand.values,
            labelFor: (w) => w.label,
            value: WouldTryNewBrand.fromCode(_draft.wouldTryNewBrandCode),
            onChanged: (v) => setState(() => _draft.wouldTryNewBrandCode = v?.code),
          ),
        ]),
      ],
    );
  }

  Widget _reviewStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'Summary', children: [
          _kv('Ward', _draft.ward),
          _kv('Household', _draft.householdSizeBand ?? '—'),
          _kv('Unaided awareness', _unaidedBrands.isEmpty ? '—' : _unaidedBrands.join(', ')),
          _kv('Aided awareness', [..._aidedFlour, ..._aidedDairy].join(', ')),
          _kv('Consent', _draft.consentAgreed ? 'Agreed' : 'Not agreed'),
        ]),
      ],
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(k, style: const TextStyle(color: Colors.grey)),
          ),
          Expanded(child: Text(v)),
        ],
      ),
    );
  }
}
