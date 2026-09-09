class UserModel {
  final String id;
  final String email;
  final String phone;
  final String role;
  final String status;
  final bool isEmailVerified;
  final bool isPhoneVerified;
  final String? fullName;
  final String? referralCode;

  UserModel({
    required this.id,
    required this.email,
    required this.phone,
    required this.role,
    required this.status,
    required this.isEmailVerified,
    required this.isPhoneVerified,
    this.fullName,
    this.referralCode,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      role: json['role'] as String? ?? 'CUSTOMER',
      status: json['status'] as String? ?? 'ACTIVE',
      isEmailVerified: json['isEmailVerified'] as bool? ?? false,
      isPhoneVerified: json['isPhoneVerified'] as bool? ?? false,
      fullName: json['profile']?['fullName'] as String? ?? json['fullName'] as String?,
      referralCode: json['referralCode'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'phone': phone,
        'role': role,
        'status': status,
        'isEmailVerified': isEmailVerified,
        'isPhoneVerified': isPhoneVerified,
        'fullName': fullName,
        'referralCode': referralCode,
      };
}
