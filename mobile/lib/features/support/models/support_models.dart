class SupportTicketModel {
  final String id;
  final String ticketNumber;
  final String subject;
  final String category;
  final String priority;
  final String status;
  final String createdAt;

  SupportTicketModel({
    required this.id,
    required this.ticketNumber,
    required this.subject,
    required this.category,
    required this.priority,
    required this.status,
    required this.createdAt,
  });

  factory SupportTicketModel.fromJson(Map<String, dynamic> json) {
    return SupportTicketModel(
      id: json['id'] as String? ?? '',
      ticketNumber: json['ticketNumber'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      category: json['category'] as String? ?? 'GENERAL',
      priority: json['priority'] as String? ?? 'MEDIUM',
      status: json['status'] as String? ?? 'OPEN',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}
