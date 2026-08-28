import 'package:flutter/material.dart';

import '../data/field_guide.dart';
import '../theme/brand.dart';
import '../widgets/warm.dart';

/// The Field Officer Handbook, in-app. Static content shipped with the build
/// so it works fully offline — the rep carries their rules, script and
/// fallbacks on the phone, not in a pocket.
class FieldGuideScreen extends StatelessWidget {
  const FieldGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.paper,
      appBar: AppBar(
        backgroundColor: Brand.ink,
        foregroundColor: Colors.white,
        title: const Text(
          'Field Guide',
          style: TextStyle(fontFamily: Brand.fontMono, fontWeight: FontWeight.w700, letterSpacing: 0.12),
        ),
        centerTitle: false,
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 48),
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Text(
              'Market Link · Kanini Field',
              style: TextStyle(color: Brand.inkSoft, fontSize: 11, fontFamily: Brand.fontMono, letterSpacing: 0.14, fontWeight: FontWeight.w600),
            ),
          ),
          for (final section in kFieldGuide) _SectionCard(section: section),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Text(
              'Confidential — everything you record belongs to Playmax and is confidential. Do not share shop data, photographs or lists outside the programme systems.',
              style: TextStyle(color: Brand.inkSoft, fontSize: 10.5, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final GuideSection section;
  const _SectionCard({required this.section});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: WarmCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              section.title.toUpperCase(),
              style: const TextStyle(
                color: Brand.amberDeep,
                fontFamily: Brand.fontMono,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.12,
              ),
            ),
            const SizedBox(height: 12),
            for (var i = 0; i < section.blocks.length; i++) ...[
              if (i > 0) const SizedBox(height: 14),
              _GuideBlockView(block: section.blocks[i]),
            ],
          ],
        ),
      ),
    );
  }
}

class _GuideBlockView extends StatelessWidget {
  final GuideBlock block;
  const _GuideBlockView({required this.block});

  @override
  Widget build(BuildContext context) {
    switch (block.kind) {
      case 'clock':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final (time, detail) in block.rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 96,
                      child: Text(
                        time,
                        style: const TextStyle(
                          color: Brand.amberDeep,
                          fontFamily: Brand.fontMono,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        detail,
                        style: const TextStyle(color: Brand.ink, fontSize: 12.5, height: 1.45),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      case 'quote':
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Brand.amber.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: const Border(left: BorderSide(color: Brand.amberDeep, width: 3)),
          ),
          child: Text(
            block.body,
            style: const TextStyle(color: Brand.ink, fontSize: 13, height: 1.5, fontWeight: FontWeight.w600),
          ),
        );
      case 'two':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              block.label.toUpperCase(),
              style: TextStyle(
                color: block.label == 'Never' ? Brand.stampRed : Brand.stampGreen,
                fontFamily: Brand.fontMono,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.12,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              block.body,
              style: const TextStyle(color: Brand.ink, fontSize: 12.5, height: 1.5),
            ),
          ],
        );
      case 'rows':
      default:
        return block.body.isNotEmpty
            ? Text(block.body, style: const TextStyle(color: Brand.ink, fontSize: 12.5, height: 1.5))
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final (k, v) in block.rows)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 9),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            k,
                            style: const TextStyle(
                              color: Brand.amberDeep,
                              fontFamily: Brand.fontMono,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(v, style: const TextStyle(color: Brand.ink, fontSize: 12.5, height: 1.4)),
                        ],
                      ),
                    ),
                ],
              );
    }
  }
}
