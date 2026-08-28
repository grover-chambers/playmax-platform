import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/retailer_provider.dart';

class RetailerList extends StatelessWidget {
  const RetailerList({super.key});

  @override
  Widget build(BuildContext context) {
    final retailers = context.watch<RetailerProvider>().retailers;

    if (retailers.isEmpty) {
      return const Center(child: Text('No retailers in this route'));
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: retailers.length,
      itemBuilder: (context, index) {
        final retailer = retailers[index];
        return ListTile(
          leading: const Icon(Icons.store),
          title: Text(retailer.name),
          subtitle: Text(retailer.status == 'active'
              ? '${retailer.tier} tier, ${retailer.businessType ?? 'retailer'}'
              : retailer.status),
          trailing: const Icon(Icons.arrow_right_alt),
          onTap: () => Navigator.pushNamed(context, '/check-in', arguments: retailer.id),
        );
      },
    );
  }
}
