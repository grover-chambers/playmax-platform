import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../domain/typology.dart';
import '../providers/auth_provider.dart';
import '../providers/census_provider.dart';
import '../providers/retailer_provider.dart';
import '../services/census_service.dart';
import '../services/location_service.dart';
import '../services/photo_service.dart';
import '../services/quality_service.dart';
import '../theme/brand.dart';
import '../ui_fx.dart';
import '../widgets/form_controls.dart';

/// OUTLET CENSUS FLOW — §4. The enumerator walks through identify → GPS →
/// consent → profile → category matrix → review. Quality gates run at submit.
class OutletCensusFlow extends StatefulWidget {
  const OutletCensusFlow({super.key});

  @override
  State<OutletCensusFlow> createState() => _OutletCensusFlowState();
}

class _OutletCensusFlowState extends State<OutletCensusFlow> {
  final _location = LocationService();
  int _step = 0;
  bool _busy = false;
  String? _gpsStatus = 'No GPS fix yet';
  String? _photoPath;

  final _categoryDrafts = <String, CategoryDraft>{};

  CensusProvider get _census => context.read<CensusProvider>();
  CensusDraft get _draft => _census.draft;

  bool get _gpsOk {
    final p = _draft.gpsFix;
    return p != null && qualityService.gateGps(p.accuracy) == null;
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
      if (fix != null) {
        _draft.gpsFix = fix;
        _gpsStatus = 'Fix locked (${fix.accuracy.toStringAsFixed(1)} m accuracy)';
        UiFx.confirm();
      } else {
        _gpsStatus = 'Could not get a fix — enable location services and retry.';
        UiFx.reject();
      }
    });
  }

  Future<void> _capturePhoto() async {
    try {
      final (path, _) = await PhotoService.captureWithGeotag();
      if (!mounted) return;
      UiFx.tap();
      setState(() {
        _photoPath = path;
        _draft.storefrontPhotoPath = path;
      });
    } catch (e) {
      UiFx.reject();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Photo failed: $e')));
      }
    }
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    // Fail closed: this flow is only reachable when authenticated. A null
    // session here means the app state is broken — never fall back to a
    // fake rep id.
    final repId = context.read<AuthProvider>().currentUser?.id;
    if (repId == null) {
      setState(() => _busy = false);
      throw StateError('Not authenticated — sign in before submitting a census.');
    }
    try {
      final outlet = await _census.submit(repId);
      if (!mounted) return;
      UiFx.stamp();
      await stampIn(
        context,
        text: 'CENSUS SAVED',
        color: Brand.stampGreen,
        detail: outlet.businessName,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Census saved for ${outlet.businessName}'),
      ));
      Navigator.of(context).pop(true);
    } on CensusRejectedException catch (e) {
      UiFx.reject();
      if (!mounted) return;
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Census rejected by quality gate'),
          content: Text(e.message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Fix it'),
            ),
          ],
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _validate(int step) {
    final d = _draft;
    switch (step) {
      case 0:
        if (d.businessName.trim().isEmpty) return 'Business name is required.';
        if (d.channel == null) return 'Select a channel.';
        if (d.outletType == null) return 'Select an outlet type.';
        if (d.ward.trim().isEmpty) return 'Ward is required.';
        return null;
      case 1:
        if (d.gpsFix == null) return 'Acquire a GPS fix first.';
        if (!_gpsOk) return 'GPS accuracy must be ≤ 15 m. Move to open sky and retry.';
        if (d.storefrontPhotoPath == null) return 'Storefront photo is required (§4.1).';
        return null;
      case 2:
        if (!d.consentAgreed) return 'The respondent must agree before any data is collected.';
        if ((d.contactName ?? '').trim().isEmpty) return 'Contact name is required.';
        return null;
      case 3:
        return null;
      case 4:
        if (d.categoryDrafts.isEmpty) return 'Record at least one category.';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Outlet Census')),
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
                  FilledButton(
                    onPressed: _busy ? null : _next,
                    child: const Text('Next'),
                  )
                else
                  FilledButton.icon(
                    onPressed: _busy ? null : _submit,
                    icon: _busy
                        ? const SizedBox(
                            width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.check),
                    label: const Text('Submit Census'),
                  ),
              ],
            ),
          );
        },
        steps: [
          Step(
            title: const Text('Identify & Location'),
            isActive: _step >= 0,
            content: _identifyStep(),
          ),
          Step(
            title: const Text('GPS & Photo'),
            isActive: _step >= 1,
            content: _gpsStep(),
          ),
          Step(
            title: const Text('Consent & Contact'),
            isActive: _step >= 2,
            content: _consentStep(),
          ),
          Step(
            title: const Text('Commercial Profile'),
            isActive: _step >= 3,
            content: _profileStep(),
          ),
          Step(
            title: const Text('Categories & Brands'),
            isActive: _step >= 4,
            content: _categoryStep(),
          ),
          Step(
            title: const Text('Review & Submit'),
            isActive: _step >= 5,
            content: _reviewStep(),
          ),
        ],
      ),
    );
  }

  Widget _identifyStep() {
    final d = _draft;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'Identity', children: [
          TextField(
            decoration: const InputDecoration(labelText: 'Business name *'),
            onChanged: (v) => setState(() => d.businessName = v),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<Channel>(
            label: 'Channel *',
            options: Channel.values,
            labelFor: (c) => c.label,
            value: d.channel,
            onChanged: (v) => setState(() {
              d.channel = v;
              d.outletType = null;
            }),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<OutletType>(
            label: 'Outlet type *',
            options: d.channel == null
                ? OutletType.values
                : OutletType.forChannel(d.channel!),
            labelFor: (t) => t.label,
            value: d.outletType,
            onChanged: (v) => setState(() => d.outletType = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Street / road'),
            onChanged: (v) => setState(() => d.street = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Landmark'),
            onChanged: (v) => setState(() => d.landmark = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Building / stall no.'),
            onChanged: (v) => setState(() => d.buildingOrStallNo = v),
          ),
        ]),
        SectionCard(title: 'Location (county → beat)', children: [
          TextField(
            decoration: const InputDecoration(labelText: 'County'),
            onChanged: (v) => setState(() => d.county = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Constituency'),
            onChanged: (v) => setState(() => d.constituency = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Ward *'),
            onChanged: (v) => setState(() => d.ward = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Beat'),
            onChanged: (v) => setState(() => d.beat = v),
          ),
          const SizedBox(height: 12),
          ChipMultiSelect(
            title: 'Operating days',
            codes: OperatingDay.values.map((d) => d.code).toList(),
            labels: OperatingDay.values.map((d) => d.label).toList(),
            selected: d.operatingDays.toSet(),
            onChanged: (s) => setState(() => d.operatingDays = s.toList()),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Opening hours'),
            onChanged: (v) => setState(() => d.openingHours = v),
          ),
        ]),
      ],
    );
  }

  Widget _gpsStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'GPS fix (gate ≤ 15 m)', children: [
          Text(_gpsStatus ?? ''),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: _busy ? null : _acquireGps,
            icon: const Icon(Icons.gps_fixed),
            label: const Text('Acquire GPS fix'),
          ),
        ]),
        SectionCard(title: 'Storefront photo (§4.1)', children: [
          Row(
            children: [
              Icon(
                _photoPath != null ? Icons.check_circle : Icons.photo_camera,
                color: _photoPath != null ? Colors.green : null,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(_photoPath != null
                    ? 'Photo captured'
                    : 'Required — a geotagged photo of the storefront'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _capturePhoto,
            icon: const Icon(Icons.photo),
            label: Text(_photoPath != null ? 'Retake photo' : 'Capture storefront'),
          ),
        ]),
      ],
    );
  }

  Widget _consentStep() {
    final d = _draft;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionCard(title: 'Read the script aloud', children: [ConsentScript()]),
        SectionCard(title: 'Consent', children: [
          CheckboxListTile(
            title: const Text('Respondent agreed to participate'),
            value: d.consentAgreed,
            onChanged: (v) => setState(() => d.consentAgreed = v ?? false),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          CheckboxListTile(
            title: const Text('Reuse for other market intelligence clients understood'),
            value: d.consentReuseAgreed,
            onChanged: (v) => setState(() => d.consentReuseAgreed = v ?? false),
            controlAffinity: ListTileControlAffinity.leading,
          ),
        ]),
        SectionCard(title: 'Contact (§4.3 — minimised)', children: [
          TextField(
            decoration: const InputDecoration(labelText: 'Contact name *'),
            onChanged: (v) => setState(() => d.contactName = v),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<ContactRole>(
            label: 'Role',
            options: ContactRole.values,
            labelFor: (r) => r.label,
            value: d.contactRole,
            onChanged: (v) => setState(() => d.contactRole = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Phone (for relevant offers)',
              hintText: '07XX XXX XXX',
            ),
            keyboardType: TextInputType.phone,
            onChanged: (v) => setState(() => d.contactPhone = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Preferred language'),
            onChanged: (v) => setState(() => d.preferredLanguage = v),
          ),
          const SizedBox(height: 12),
          CheckboxListTile(
            title: const Text('Is the decision maker'),
            value: d.isDecisionMaker,
            onChanged: (v) => setState(() => d.isDecisionMaker = v ?? false),
            controlAffinity: ListTileControlAffinity.leading,
          ),
        ]),
      ],
    );
  }

  Widget _profileStep() {
    final d = _draft;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'Size & demand', children: [
          LabeledDropdown<OutletSizeTier>(
            label: 'Size tier',
            options: OutletSizeTier.values,
            labelFor: (t) => t.label,
            value: d.sizeTier,
            onChanged: (v) => setState(() => d.sizeTier = v),
          ),
          const SizedBox(height: 12),
          NumberField(
            label: 'Shelf facing (metres)',
            onChanged: (v) => setState(() => d.shelfFacingMetres = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Estimated daily customers',
              hintText: 'e.g. 100-150',
            ),
            onChanged: (v) => setState(() => d.estDailyCustomers = v),
          ),
        ]),
        SectionCard(title: 'Supply & service', children: [
          LabeledDropdown<PurchaseFrequency>(
            label: 'Purchase frequency',
            options: PurchaseFrequency.values,
            labelFor: (f) => f.label,
            value: d.purchaseFrequency,
            onChanged: (v) => setState(() => d.purchaseFrequency = v),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<PrimarySupplySource>(
            label: 'Primary supply source',
            options: PrimarySupplySource.values,
            labelFor: (s) => s.label,
            value: d.primarySupplySource,
            onChanged: (v) => setState(() => d.primarySupplySource = v),
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(labelText: 'Supplier name'),
            onChanged: (v) => setState(() => d.supplierName = v),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<DeliveryMode>(
            label: 'Delivery or collect',
            options: DeliveryMode.values,
            labelFor: (m) => m.label,
            value: d.deliveryOrCollect,
            onChanged: (v) => setState(() => d.deliveryOrCollect = v),
          ),
        ]),
        SectionCard(title: 'Facilities', children: [
          SwitchListTile(
            title: const Text('Fridge'),
            value: d.hasFridge,
            onChanged: (v) => setState(() => d.hasFridge = v),
          ),
          SwitchListTile(
            title: const Text('Freezer'),
            value: d.hasFreezer,
            onChanged: (v) => setState(() => d.hasFreezer = v),
          ),
          SwitchListTile(
            title: const Text('Sells on credit'),
            value: d.sellsOnCredit,
            onChanged: (v) => setState(() => d.sellsOnCredit = v),
          ),
          SwitchListTile(
            title: const Text('Accepts M-Pesa'),
            value: d.acceptsMpesa,
            onChanged: (v) => setState(() => d.acceptsMpesa = v),
          ),
          const SizedBox(height: 12),
          LabeledDropdown<StorageCapacity>(
            label: 'Storage capacity',
            options: StorageCapacity.values,
            labelFor: (c) => c.label,
            value: d.storageCapacity,
            onChanged: (v) => setState(() => d.storageCapacity = v),
          ),
        ]),
      ],
    );
  }

  Widget _categoryStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(
          title: 'Relevant categories',
          subtitle: 'Ask for every category this outlet handles, every visit.',
          children: [
            ChipMultiSelect(
              title: 'Categories stocked',
              codes: ProductCategory.values.map((c) => c.code).toList(),
              labels: ProductCategory.values.map((c) => c.label).toList(),
              selected: _categoryDrafts.keys.toSet(),
              onChanged: (selected) => setState(() {
                for (final code in selected) {
                  if (!_categoryDrafts.containsKey(code)) {
                    _categoryDrafts[code] =
                        CategoryDraft(ProductCategory.fromCode(code)!);
                  }
                }
                _categoryDrafts.removeWhere((k, _) => !selected.contains(k));
                _draft.categoryDrafts
                  ..clear()
                  ..addAll(_categoryDrafts.values);
              }),
            ),
          ],
        ),
        for (final entry in _categoryDrafts.entries) _categoryCard(entry.value),
      ],
    );
  }

  Widget _categoryCard(CategoryDraft cd) {
    final brandList = brandListFor(cd.category);
    return SectionCard(
      title: cd.category.label,
      subtitle: brandList != null ? 'Fixed brand list per spec §4.4' : 'Free text brands',
      children: [
        SwitchListTile(
          title: const Text('Stocked now'),
          value: cd.stockedNow,
          onChanged: (v) => setState(() => cd.stockedNow = v),
        ),
        if (brandList != null)
          ChipMultiSelect(
            title: 'Brands present',
            codes: brandList.split('|'),
            labels: brandList.split('|'),
            selected: cd.brandsPresent.toSet(),
            onChanged: (s) => setState(() => cd.brandsPresent = s.toList()),
          )
        else
          TextField(
            decoration: const InputDecoration(labelText: 'Brands present (comma-separated)'),
            onChanged: (v) => setState(() => cd.otherBrands = v),
          ),
        const SizedBox(height: 12),
        ChipMultiSelect(
          title: 'Pack sizes',
          codes: PackSize.values.map((p) => p.code).toList(),
          labels: PackSize.values.map((p) => p.label).toList(),
          selected: cd.packSizesPresent.toSet(),
          onChanged: (s) => setState(() => cd.packSizesPresent = s.toList()),
        ),
        const SizedBox(height: 12),
        NumberField(
          label: 'Shelf facings',
          onChanged: (v) => setState(() => cd.shelfFacings = v.toInt()),
        ),
        const SizedBox(height: 12),
        NumberField(
          label: 'Price observed (KES)',
          onChanged: (v) => setState(() => cd.priceObserved = v),
        ),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(labelText: 'Stock units on hand'),
          keyboardType: TextInputType.number,
          onChanged: (v) =>
              setState(() => cd.stockUnitsOnHand = int.tryParse(v)),
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          title: const Text('Stockout in last 7 days'),
          value: cd.stockoutLast7Days,
          onChanged: (v) => setState(() => cd.stockoutLast7Days = v),
        ),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(labelText: 'Fastest moving brand'),
          onChanged: (v) => setState(() => cd.fastestMovingBrand = v),
        ),
        const SizedBox(height: 12),
        LabeledDropdown<FastestMovingReason>(
          label: 'Why fastest?',
          options: FastestMovingReason.values,
          labelFor: (r) => r.label,
          value: cd.whyFastest,
          onChanged: (v) => setState(() => cd.whyFastest = v),
        ),
      ],
    );
  }

  Widget _reviewStep() {
    final d = _draft;
    // Real client/account data from the backend (retailers table, RLS-scoped
    // to the signed-in rep). No hardcoded demo accounts.
    final clients = context.watch<RetailerProvider>().retailers;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(title: 'Summary', children: [
          _kv('Business', d.businessName),
          _kv('Channel / type', '${d.channel?.label} / ${d.outletType?.label}'),
          _kv('Ward', d.ward),
          _kv('GPS', d.gpsFix == null ? '—' : '${d.gpsFix!.latitude.toStringAsFixed(5)}, '
              '${d.gpsFix!.longitude.toStringAsFixed(5)}'),
          _kv('Contact', d.contactName ?? '—'),
          _kv('Categories', '${d.categoryDrafts.length} recorded'),
          _kv('Consent', d.consentAgreed ? 'Agreed' : 'Not agreed'),
        ]),
        SectionCard(
          title: 'Status per client (§3.3)',
          subtitle: 'The same outlet can be a customer of one client and a '
              'prospect of another.',
          children: [
            if (clients.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  'No client accounts assigned yet — statuses will appear here '
                  'once accounts are loaded for your beat.',
                  style: TextStyle(color: Colors.grey, fontSize: 12.5),
                ),
              )
            else
              for (final client in clients)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: LabeledDropdown<ClientStatus>(
                    label: client.name,
                    options: ClientStatus.values,
                    labelFor: (s) => s.label,
                    value: ClientStatus.fromCode(d.clientStatuses[client.id]),
                    nullValue: null,
                    nullLabel: 'Not applicable',
                    onChanged: (v) => setState(() {
                      if (v == null) {
                        d.clientStatuses.remove(client.id);
                      } else {
                        d.clientStatuses[client.id] = v.code;
                      }
                    }),
                  ),
                ),
          ],
        ),
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
