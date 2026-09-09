import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../providers/support_provider.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String _selectedCategory = 'BILL_FAILURE';
  String _selectedPriority = 'MEDIUM';

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _showCreateTicketModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Submit Support Dispute',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textLightPrimary),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _subjectController,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(labelText: 'Subject', hintText: 'e.g. Electricity Token Not Delivered'),
              ),
              const SizedBox(height: 14),

              DropdownButtonFormField<String>(
                value: _selectedCategory,
                dropdownColor: AppColors.darkSurface,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(labelText: 'Category'),
                items: const [
                  DropdownMenuItem(value: 'BILL_FAILURE', child: Text('Bill Payment Issue')),
                  DropdownMenuItem(value: 'AIRTIME_DATA', child: Text('Airtime or Data Delay')),
                  DropdownMenuItem(value: 'WALLET_DEPOSIT', child: Text('Wallet Deposit Dispute')),
                  DropdownMenuItem(value: 'GENERAL', child: Text('General Inquiry')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
              const SizedBox(height: 14),

              TextFormField(
                controller: _messageController,
                maxLines: 3,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(labelText: 'Description / Message', hintText: 'Describe the issue...'),
              ),
              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: () async {
                  if (_subjectController.text.trim().isEmpty || _messageController.text.trim().isEmpty) return;

                  final success = await ref.read(createTicketProvider.notifier).createTicket(
                        subject: _subjectController.text,
                        category: _selectedCategory,
                        priority: _selectedPriority,
                        message: _messageController.text,
                      );

                  if (success && context.mounted) {
                    Navigator.pop(context);
                    _subjectController.clear();
                    _messageController.clear();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Support ticket opened! Our team will respond shortly.')),
                    );
                  }
                },
                child: const Text('Submit Ticket'),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final ticketsAsync = ref.watch(supportTicketsProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Customer Support'),
        leading: IconButton(icon: const Icon(LucideIcons.arrowLeft), onPressed: () => context.pop()),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateTicketModal,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        icon: const Icon(LucideIcons.plus),
        label: const Text('New Ticket', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(supportTicketsProvider),
        child: ticketsAsync.when(
          data: (tickets) {
            if (tickets.isEmpty) {
              return const Center(
                child: Text('No support tickets opened.', style: TextStyle(color: AppColors.textLightSecondary)),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: tickets.length,
              itemBuilder: (context, index) {
                final ticket = tickets[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.darkSurface,
                    borderRadius: AppSpacing.roundedMd,
                    border: Border.all(color: AppColors.darkBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          Text(ticket.ticketNumber, style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: AppColors.primary)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(ticket.status, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(ticket.subject, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLightPrimary, fontSize: 15)),
                      const SizedBox(height: 4),
                      Text(ticket.category, style: const TextStyle(fontSize: 12, color: AppColors.textLightSecondary)),
                    ],
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Error loading tickets: $e')),
        ),
      ),
    );
  }
}
