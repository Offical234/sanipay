import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/date_formatter.dart';
import '../models/transaction_models.dart';
import '../providers/transactions_provider.dart';

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  void _showReceiptDialog(BuildContext context, TransactionItemModel tx) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.darkSurface,
          shape: RoundedRectangleBorder(borderRadius: AppSpacing.roundedMd),
          title: Row(
            children: [
              const Icon(LucideIcons.receipt, color: AppColors.primary, size: 24),
              const SizedBox(width: 10),
              const Text('Digital Receipt', style: TextStyle(color: AppColors.textLightPrimary, fontWeight: FontWeight.w700)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Column(
                  children: [
                    Text(
                      tx.amountFormatted,
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.primary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tx.status,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: tx.status == 'SUCCESS' ? AppColors.success : AppColors.error,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Divider(color: AppColors.darkBorder),
              const SizedBox(height: 10),
              _buildReceiptRow('Reference', tx.reference),
              _buildReceiptRow('Service', tx.type.replaceAll('_', ' ')),
              _buildReceiptRow('Provider', tx.providerName),
              _buildReceiptRow('Date & Time', DateFormatter.formatDateTime(tx.createdAt)),
            ],
          ),
          actions: [
            OutlinedButton.icon(
              onPressed: () {
                Share.share(
                  'SaniPay Transaction Receipt\nRef: ${tx.reference}\nAmount: ${tx.amountFormatted}\nStatus: ${tx.status}\nDate: ${DateFormatter.formatDateTime(tx.createdAt)}',
                );
              },
              icon: const Icon(LucideIcons.share2, size: 16),
              label: const Text('Share'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.between,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textLightSecondary, fontSize: 12)),
          Text(value, style: const TextStyle(color: AppColors.textLightPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final txnsAsync = ref.watch(transactionsProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Transaction History'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(transactionsProvider),
        child: txnsAsync.when(
          data: (txns) {
            if (txns.isEmpty) {
              return const Center(
                child: Text('No transaction history found.', style: TextStyle(color: AppColors.textLightSecondary)),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: txns.length,
              itemBuilder: (context, index) {
                final tx = txns[index];
                return GestureDetector(
                  onTap: () => _showReceiptDialog(context, tx),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurface,
                      borderRadius: AppSpacing.roundedMd,
                      border: Border.all(color: AppColors.darkBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tx.type.replaceAll('_', ' '),
                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLightPrimary, fontSize: 14),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              DateFormatter.formatDateOnly(tx.createdAt),
                              style: const TextStyle(color: AppColors.textLightSecondary, fontSize: 11),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              tx.amountFormatted,
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                                color: tx.status == 'SUCCESS' ? AppColors.primary : AppColors.error,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              tx.status,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: tx.status == 'SUCCESS' ? AppColors.success : AppColors.error,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Error loading history: $e')),
        ),
      ),
    );
  }
}
