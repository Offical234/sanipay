# SaniPay — Cross-Platform Mobile Application Architecture Specification
## Phase 13: Flutter/Dart Client, Riverpod State Management, GoRouter, and Digital VTU Flows

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 13 — Cross-Platform Mobile Client Architecture
- **Framework & SDK:** Flutter SDK (3.x stable) + Dart (3.x)
- **State Management:** `flutter_riverpod` (v2.6+)
- **Navigation:** `go_router` (v14+) with Auth Guards and Referral Deep Linking
- **Networking:** `dio` (v5+) with Bearer JWT Interceptor and 401 Auto-Recovery
- **Security & Storage:** `flutter_secure_storage` (Android EncryptedSharedPreferences / iOS Keychain)

---

## 1. System Architecture & Component Interactions

```
                          ┌───────────────────────────┐
                          │   Flutter UI Layer (M3)   │
                          │  Screens & Custom Widgets │
                          └─────────────┬─────────────┘
                                        │ User Actions / Watches State
                                        ▼
                          ┌───────────────────────────┐
                          │     Riverpod Providers    │
                          │  (StateNotifiers / Async) │
                          └─────────────┬─────────────┘
                                        │ Calls Methods
                                        ▼
                          ┌───────────────────────────┐
                          │   Core Services Layer     │
                          │ • ApiClient (Dio)         │
                          │ • SecureStorageService    │
                          │ • CurrencyFormatter       │
                          │ • PhoneValidator          │
                          └─────────────┬─────────────┘
                                        │ HTTPS Requests + Bearer JWT
                                        ▼
                          ┌───────────────────────────┐
                          │   SaniPay NestJS API      │
                          │  (http://host:3000/api/v1)│
                          └───────────────────────────┘
```

---

## 2. Directory Structure & Modular Organization

The `mobile/` directory implements a **feature-first modular architecture** ensuring high maintainability and testability:

```
mobile/
├── pubspec.yaml                              # Declared packages & assets
├── analysis_options.yaml                     # Strict type-safety linting
├── android/app/src/main/AndroidManifest.xml  # Biometrics & deep link intent filters
├── ios/Runner/Info.plist                     # Face ID & universal links
├── lib/
│   ├── core/
│   │   ├── config/app_config.dart            # API URLs and global app settings
│   │   ├── constants/
│   │   │   ├── app_colors.dart               # Emerald & midnight obsidian palette
│   │   │   ├── app_spacing.dart              # Standardized radii & paddings
│   │   │   └── api_endpoints.dart            # Endpoint path constants
│   │   ├── network/
│   │   │   ├── api_client.dart               # Centralized Dio HTTP client
│   │   │   ├── auth_interceptor.dart         # Bearer token injection
│   │   │   └── api_exception.dart            # Structured error envelope
│   │   ├── router/
│   │   │   ├── app_router.dart               # GoRouter definition with guards
│   │   │   └── route_names.dart              # Route constants
│   │   ├── storage/
│   │   │   └── secure_storage_service.dart   # Encrypted token storage
│   │   ├── theme/
│   │   │   └── app_theme.dart                # Material 3 dark and light themes
│   │   └── utils/
│   │       ├── currency_formatter.dart       # Kobo integer to formatted Naira (₦)
│   │       ├── phone_validator.dart          # Telecom operator prefix identification
│   │       └── date_formatter.dart           # Localized date timestamps
│   ├── features/
│   │   ├── auth/                             # Splash, Onboarding, Login, Register
│   │   ├── dashboard/                        # Bottom navigation bar shell
│   │   ├── home/                             # Balance card & quick service grid
│   │   ├── wallet/                           # Balance details & P2P wallet transfers
│   │   ├── airtime/                          # Operator selection, chips, purchase
│   │   ├── data/                             # Dynamic data bundle catalog grid
│   │   ├── electricity/                      # DisCo selector, meter lookup, token dialog
│   │   ├── cable/                            # Provider selection, smartcard lookup
│   │   ├── transactions/                     # History ledger & digital receipt sharing
│   │   ├── referral/                         # Share code, commission claim
│   │   ├── profile/                          # User profile, security, PIN management
│   │   └── support/                          # Ticket creation & customer support
│   └── main.dart                             # Entry point with ProviderScope
└── test/
    └── widget_test.dart                      # Baseline widget smoke test
```

---

## 3. Core Features & User Workflows

### 3.1 Authentication & Security Workflow
- **Biometric Integration:** Secure biometric challenges (Fingerprint / Face ID) via `local_auth`.
- **4-Digit PIN Protection:** Critical mutations (Wallet transfers, airtime top-ups, bill vending) mandate numeric transaction PIN validation before dispatching API calls.
- **Auto-Logout On Token Expiry:** `AuthInterceptor` detects HTTP 401 Unauthorized responses and purges cached tokens via `SecureStorageService`.

### 3.2 Digital Utility & VTU Workflows
1. **Airtime Top-Up:**
   - Real-time Nigerian prefix matching (`PhoneValidator.detectOperator`) automatically selects MTN, Airtel, GLO, or 9mobile as the user types their phone number.
   - Quick amount chips (₦100, ₦200, ₦500, ₦1000) allow single-tap amount filling.
2. **Dynamic Data Bundles:**
   - Data bundles are fetched directly from `/api/v1/data/plans?network={CODE}` to reflect real-time aggregator variations and pricing.
3. **Electricity Pre-Validation & Token Extraction:**
   - Pre-validation lookup calls `/api/v1/electricity/verify` returning customer full name and meter address prior to debiting funds.
   - For prepaid meters, the vending response displays the extracted 20-digit token (e.g. `1234-5678-9012-3456`) in an on-screen dialog with units purchased.
4. **Referral Rewards & Deep Linking:**
   - Deep links matching `https://sanipay.ng/ref/{code}` route directly to user onboarding with the referral code pre-filled.
   - Claimable commissions can be transferred directly to the user's wallet with one tap.

---

## 4. Verification & Readiness

| Metric | Target | Result | Status |
|---|---|---|---|
| **Dart Architecture** | Feature-First Modular | Scaffolding complete across 9 domain slices | ✅ PASS |
| **API Endpoints Alignment** | 100% mapped to NestJS API | Verified in `api_endpoints.dart` | ✅ PASS |
| **Theme Design System** | Material 3 Obsidian/Emerald | Configured in `app_theme.dart` | ✅ PASS |
| **Deep Link Scheme** | `https://sanipay.ng/ref/*` | Configured in `AndroidManifest.xml` & `Info.plist` | ✅ PASS |
| **Baseline Smoke Test** | `test/widget_test.dart` | Created verifying App Title and Branding | ✅ PASS |
