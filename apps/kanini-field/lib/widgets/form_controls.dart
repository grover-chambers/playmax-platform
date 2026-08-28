import 'package:flutter/material.dart';

/// Form primitives shared by the census and intercept flows.

class SectionCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> children;

  const SectionCard({
    super.key,
    required this.title,
    this.subtitle,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(subtitle!,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Colors.grey)),
            ],
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// Multi-select chips. Returns the selected codes (not labels).
class ChipMultiSelect extends StatelessWidget {
  final String title;
  final List<String> codes;
  final List<String> labels;
  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;

  const ChipMultiSelect({
    super.key,
    required this.title,
    required this.codes,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < codes.length; i++)
              FilterChip(
                label: Text(labels[i]),
                selected: selected.contains(codes[i]),
                onSelected: (on) {
                  final next = Set<String>.of(selected);
                  if (on) {
                    next.add(codes[i]);
                  } else {
                    next.remove(codes[i]);
                  }
                  onChanged(next);
                },
              ),
          ],
        ),
      ],
    );
  }
}

class LabeledDropdown<T> extends StatelessWidget {
  final String label;
  final List<T> options;
  final String Function(T) labelFor;
  final T? value;
  final ValueChanged<T?> onChanged;
  final T? nullValue;
  final String nullLabel;

  const LabeledDropdown({
    super.key,
    required this.label,
    required this.options,
    required this.labelFor,
    required this.value,
    required this.onChanged,
    this.nullValue,
    this.nullLabel = 'Select…',
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T?>(
      initialValue: value ?? nullValue,
      decoration: InputDecoration(labelText: label),
      items: [
        if (nullValue != null)
          DropdownMenuItem<T?>(value: nullValue, child: Text(nullLabel)),
        for (final o in options) DropdownMenuItem<T?>(value: o, child: Text(labelFor(o))),
      ],
      onChanged: onChanged,
    );
  }
}

class NumberField extends StatelessWidget {
  final String label;
  final String? hint;
  final ValueChanged<double> onChanged;
  final double? initialValue;

  const NumberField({
    super.key,
    required this.label,
    this.hint,
    required this.onChanged,
    this.initialValue,
  });

  @override
  Widget build(BuildContext context) {
    final ctrl = TextEditingController(
      text: initialValue != null ? initialValue!.toString() : '',
    );
    return TextField(
      controller: ctrl,
      decoration: InputDecoration(labelText: label, hintText: hint),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      onChanged: (v) => onChanged(double.tryParse(v) ?? 0),
    );
  }
}

/// Read-only consent script per §6 / clause 10.5. The respondent must be told
/// that Playmax Ltd (trading as Market Link) is the controller in its own
/// right and that data is retained and reused for other commercial clients.
class ConsentScript extends StatelessWidget {
  final String? variant;
  const ConsentScript({super.key, this.variant});

  @override
  Widget build(BuildContext context) {
    final intercept = variant == 'intercept';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        intercept
            ? 'I am from Market Link. We are collecting anonymous information '
                'about everyday shopping to help companies serve Kenyan '
                'households better.\n\n'
                '• Your name, phone or any identifying detail is NOT collected.\n'
                '• Participation is voluntary — you may stop at any time.\n'
                '• Your answers are combined with others and may be used to '
                'provide market intelligence to commercial clients.\n\n'
                'Do you agree to take part?'
            : 'I am from Market Link (Playmax Ltd). We are building a market '
                'directory of businesses in this area.\n\n'
                '• We collect the business name, location and the categories '
                'you stock.\n'
                '• We will collect a contact name and phone so we can call '
                'about relevant offers — this is personal data.\n'
                '• Playmax Ltd, trading as Market Link, is the data controller '
                'in its own right.\n'
                '• Data may be retained and reused to provide market '
                'intelligence services to other commercial clients.\n'
                '• Participation is voluntary and you can withdraw any time by '
                'calling 0700 000 000.\n\n'
                'Do you agree to take part?',
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }
}
