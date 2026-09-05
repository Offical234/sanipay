# SaniPay — Nigerian VTU & Digital Services Platform
## Phase 1: Requirements Specification & Project Planning Document

---

### Document Overview
- **Project Name:** SaniPay (Configurable application branding)
- **Target Platforms:** Mobile (Android & iOS via single Flutter/Dart codebase) + Backend (Node.js/TypeScript REST API) + Web Admin Dashboard
- **Document Version:** 1.0.0
- **Status:** Phase 1 Complete — Pending User Review & Approval

---

## 1. Workspace Inspection & Environment Baseline

### 1.1 Workspace Status
- **Directory:** `c:\xampp\htdocs\data station`
- **Current State:** Completely empty green-field workspace. No existing legacy codebase or conflicting configurations.

### 1.2 Environment Assessment
- **Operating System:** Windows 11 (x64)
- **Node.js:** `v24.16.0` (Installed)
- **npm:** `v11.13.0` (Installed & operational via `npm.cmd`)
- **Git:** `v2.55.0.windows.5` (Installed)
- **Local Database Tooling:** XAMPP installed at `C:\xampp` with MySQL/MariaDB (`C:\xampp\mysql\bin\mysql.exe`) and PHP.
- **Flutter SDK:** Currently not present in the system PATH. To be installed or configured prior to Phase 6 (Flutter Mobile Setup).

---

## 2. Complete Feature List & Scope

### 2.1 User Onboarding & Identity
1. **Application Splash Screen & Onboarding:**
   - Visual identity presentation with configurable app name ("SaniPay"), logo, and tagline.
   - 3-step value proposition slider: Instant Airtime & Data, Frictionless Bill Payments, Automated Cashbacks & Referrals.
2. **Registration & KYC Tier 0/1:**
   - Collection of Full Name, Nigerian Phone Number (080..., 070..., 090..., 081...), Email Address, Secure Password, and optional Referral Code.
   - 4-digit numeric Transaction PIN creation (hashed and salt-protected; never stored in plaintext).
3. **Verification (OTP):**
   - Phone number and Email verification via time-limited 6-digit OTP (10-minute expiry, rate-limited resend).
   - Mock/Sandbox OTP mode for development and local testing (`123456`).
4. **Secure Authentication:**
   - Password-based login with email/phone identifier.
   - Biometric authentication (Fingerprint / Face ID) via secure local enclave integration.
   - Password reset flow with cryptographic reset token or phone OTP.
   - JWT authentication: short-lived Access Tokens (15 mins) + rotating Refresh Tokens (30 days) stored in secure device storage.
   - Transaction PIN challenge on all sensitive operations.

### 2.2 Wallet & Financial Accounting
1. **Wallet System:**
   - Single source of truth ledger for each user.
   - Multi-tier financial balance represented strictly as **integers in Kobo** (1 NGN = 100 Kobo) to eliminate IEEE-754 floating-point rounding errors.
   - Ledger models: Double-entry accounting principles (debit/credit balance consistency).
2. **Wallet Funding:**
   - Integration with regulated Nigerian Payment Gateways (Paystack, Flutterwave, Monnify).
   - Dynamic checkout link / SDK popup funding.
   - Dedicated Virtual Account Number (DVA) generation (e.g. Wema, Providus, Moniepoint) for instant bank transfer funding.
   - Webhook verification with cryptographic signature verification (HMAC-SHA512).
   - Idempotent transaction processing to guarantee zero duplicate funding.

### 2.3 Virtual Top-Up (VTU) & Digital Services
1. **Airtime Top-Up:**
   - Networks: MTN, Airtel, Glo, 9mobile.
   - Mode: Direct VTU and Share 'n' Sell where applicable.
   - Recipient validation: Phone number prefix auto-detection for Nigerian telecom operators.
   - Purchase for self or third-party phone number.
   - Configurable discounts/cashbacks (e.g., 2% discount on MTN airtime).
2. **Mobile Data Bundles:**
   - Data Types: SME Data, Corporate Gifting, Direct Mobile Data, Gifting.
   - Dynamic plan retrieval: Data plans are never hard-coded in the mobile app; fetched in real-time from backend.
   - Filter by network and plan type (daily, weekly, monthly, corporate).
3. **Electricity Utility Payments:**
   - Distribution Companies (DisCos): IKEDC (Ikeja), EKEDC (Eko), AEDC (Abuja), IBEDC (Ibadan), PHED (Port Harcourt), KEDCO (Kano), JED (Jos), EEDC (Enugu), KAEDCO (Kaduna), BEDC (Benin), YEDC (Yola).
   - Meter Types: Prepaid and Postpaid.
   - **Pre-transaction Meter Validation:** Mandatory validation request returning registered customer name and address before deducting wallet balance.
   - Token delivery: Instant display of generated prepaid token on receipt + SMS/email/push notification.
4. **Cable TV Subscriptions:**
   - Providers: DStv, GOtv, StarTimes, Showmax.
   - **Smartcard / IUC Validation:** Customer verification returning account holder name, current bouquet, and due date.
   - Package selection: Renewal of current bouquet or upgrade/downgrade to higher/lower tiers.

### 2.4 Transaction Lifecycle & Records
1. **Transaction Lifecycle Management:**
   - State machine: `PENDING` -> `PROCESSING` -> `SUCCESS` | `FAILED` | `REFUNDED`.
   - Provider timeout fallback with automatic background status polling or webhook resolution.
   - Automated instant wallet refund if provider reports definitive failure.
2. **Transaction History:**
   - Comprehensive searchable and filterable list (filter by service, date range, status).
   - Pagination (cursor-based or page-based).
3. **Digital Receipts:**
   - Detailed breakdown: Transaction Reference, Service Type, Recipient / Meter / IUC, Amount (NGN), Fee/Discount, Date & Time, Provider Reference, Generated Token (for electricity).
   - Export and share functionality (share receipt image or PDF via native iOS/Android share sheet).

### 2.5 Growth, Engagement & Support
1. **Referral Program:**
   - Unique alphanumeric referral code and shareable deep link per user.
   - Reward engine: Configurable bonus upon referee's first qualified wallet funding or bill transaction.
   - Separate referral commission balance with "Transfer to Wallet" action.
2. **Notification Engine:**
   - Push notifications via Firebase Cloud Messaging (FCM).
   - In-app notification inbox with read/unread tracking.
   - Event triggers: Wallet funded, bill paid, prepaid token issued, referral bonus earned, login from new device.
3. **Customer Support:**
   - In-app support ticket submission with category selection and optional transaction ID linkage.
   - Live chat or WhatsApp support direct link option.
   - Ticket status tracking (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).

### 2.6 Back-Office & Administration (Admin Dashboard)
1. **User & Wallet Oversight:**
   - User directory with search (by email, phone, name, BVN/NIN status), account suspension/activation.
   - Real-time wallet balance audit and manual ledger adjustment with required audit reasons.
2. **Transaction Reconciliation & Manual Overrides:**
   - Live stream of all platform transactions.
   - One-click status re-query against VTU provider APIs.
   - Manual refund dispatch with audit logging.
3. **Pricing, Margin & Provider Routing Engine:**
   - Dynamic service margin configuration (markup % or flat fee per provider/biller).
   - Provider failover switch: Ability to route MTN airtime to Provider A and Airtel to Provider B, with instant toggle if a provider experiences downtime.
4. **Reporting & Analytics:**
   - Daily, weekly, monthly transaction volumes, total revenue, gross margin, gateway processing fees, failed transaction analysis.

---

## 3. Functional Requirements

### 3.1 Authentication & Security Requirements
- **FR-AUTH-01:** Passwords must be at least 8 characters long, containing uppercase, lowercase, numbers, and special characters. Hashed using Argon2id or bcrypt (cost factor >= 12).
- **FR-AUTH-02:** Transaction PIN must be exactly 4 numeric digits. Hashed separately with unique per-user salt.
- **FR-AUTH-03:** Rate limiting: Maximum 5 failed login attempts per IP/account within 15 minutes before temporary lockout.
- **FR-AUTH-04:** Sensitive actions (all financial deductions, PIN changes, password resets) require explicit Transaction PIN verification or biometric re-authentication.
- **FR-AUTH-05:** Mobile client must store tokens only in Android Keystore / iOS Keychain via secure storage mechanisms.

### 3.2 Wallet & Accounting Requirements
- **FR-WAL-01:** Zero floating-point representation. Every monetary value in the database and calculation engine must be stored as an unsigned 64-bit integer representing Kobo (`1 NGN = 100 Kobo`).
- **FR-WAL-02:** Atomic ledger transactions. Any wallet mutation must execute within an ACID database transaction using row-level locking (`SELECT ... FOR UPDATE`) to prevent race conditions (double spending).
- **FR-WAL-03:** Idempotency keys (`idempotency_key`) are mandatory for all purchase and funding endpoints. Submitting the same key twice within 24 hours must return the original transaction without re-execution.
- **FR-WAL-04:** Payment gateway webhooks must be verified via HMAC signature validation against the raw request body before processing.

### 3.3 VTU & Provider Integration Requirements
- **FR-VTU-01:** Provider Abstraction Interface. All external providers must implement unified domain interfaces (`IVTUProvider`, `IPaymentGateway`). The core business logic must never directly reference provider-specific vendor code.
- **FR-VTU-02:** Provider Sandbox/Mock Engine. When operating in development/test environment, a robust internal mock provider handles all calls deterministically without external credentials.
- **FR-VTU-03:** DisCo Meter Validation. The system must never accept an electricity bill payment without a successful prior meter lookup within a 10-minute cache window.
- **FR-VTU-04:** Cable TV Validation. The system must verify smartcard/IUC numbers and display customer ownership details before transaction submission.

---

## 4. Non-Functional Requirements

### 4.1 Security & Compliance
- **NFR-SEC-01 (OWASP Top 10):** Protection against Injection (parameterized queries/ORM), Broken Authentication, Sensitive Data Exposure (no PII or secrets in logs), SSRF, and CSRF.
- **NFR-SEC-02 (Zero Client Secrets):** No payment secret keys, provider private tokens, database credentials, or server signing keys may ever be present in the Flutter mobile codebase.
- **NFR-SEC-03 (Audit Trail):** Every administrative action, price change, manual refund, and wallet balance adjustment must produce an immutable audit log entry.
- **NFR-SEC-04 (Network Security):** Transport Layer Security (TLS 1.3/1.2) enforced. Mobile app configured with SSL pinning readiness.

### 4.2 Performance & Reliability
- **NFR-PERF-01 (Response Time):** 95th percentile API response time < 350ms for local service endpoints (excluding third-party provider latency).
- **NFR-PERF-02 (Mobile Network Optimization):** Response payloads compressed with Gzip/Brotli. Dynamic caching of static metadata (telecom network lists, DisCo list, Cable providers) with HTTP cache headers and local mobile cache.
- **NFR-PERF-03 (High Availability):** Target 99.9% uptime. Asynchronous job queues for webhooks, notification dispatch, and provider retry loops.

### 4.3 Maintainability & Code Quality
- **NFR-MAINT-01:** Clean Architecture / Hexagonal design pattern isolating Domain Entities, Use Cases, Repositories, and Infrastructure Adapters.
- **NFR-MAINT-02:** 100% type safety on the backend using TypeScript strict mode.
- **NFR-MAINT-03:** 100% null safety in Dart/Flutter.

---

## 5. User Roles & Access Control (RBAC)

| Role | Description | Permissions |
| :--- | :--- | :--- |
| **End User (Customer)** | Normal consumer using mobile app | Fund wallet, buy airtime/data, pay bills, view own history, submit support tickets, manage own profile. |
| **Merchant / Agent** | High-volume reseller (tier upgrade) | Access discounted pricing rates, bulk top-up endpoints, extended daily limits. |
| **Support Agent** | Customer care representative | View user accounts (masked PII), search transactions, read and reply to support tickets. No financial modification authority. |
| **Finance / Ops Admin** | Financial operations manager | Review reconciliation discrepancies, execute verified refunds, view financial statements and profit reports. |
| **Super Admin** | System owner / Tech lead | Full system access: configure provider API credentials, edit pricing and margins, manage staff roles, access audit logs. |

---

## 6. Business Model & Financial Mechanics

### 6.1 Revenue Channels
1. **Telecom Airtime Margin:**
   - Provider wholesale discount: e.g., MTN at 2.5% discount.
   - SaniPay consumer discount: e.g., 1.5% cashback/discount.
   - **Net Margin to SaniPay:** 1.0% per transaction.
2. **Mobile Data Bundle Margin:**
   - Wholesale SME/Corporate data pricing vs retail retail pricing.
   - Margin configured per network (typically ₦20 - ₦100 per GB).
3. **Utility & Bill Payment Convenience Fee:**
   - Fixed convenience fee (e.g., ₦100 per electricity or cable transaction) or commission sharing from provider.
4. **Wallet Funding Fee Management:**
   - Free funding on virtual bank transfers (or flat subsidized fee), payment gateway card charges passed or capped per platform policy.

### 6.2 Margin & Pricing Engine Design
- Margins are stored in a dedicated database table `service_pricing`.
- Admin can dynamically adjust margin by flat value or percentage without touching backend code or restarting services.
- Real-time calculation: `Final_Price = (Provider_Cost * (1 + Margin_Percentage)) + Margin_Flat_Fee`.

---

## 7. External Integrations & Required Information

To transition from the sandbox/mock environment to live production, the following business information and external accounts will be required:

| Service Category | Typical Providers | Required Credentials / Information | Development Strategy |
| :--- | :--- | :--- | :--- |
| **Payment Gateway (Wallet Funding)** | Paystack / Flutterwave / Monnify | - Secret Key (`sk_live_...`)<br>- Public Key (`pk_live_...`)<br>- Webhook Secret (`whsec_...`)<br>- Registered Nigerian Business (CAC, Tax ID) | Built using isolated `PaymentProviderAdapter`. Default development mode uses fully simulated sandbox/mock provider with webhook emission. |
| **VTU & Bill Payments (Airtime/Data/Bills)** | VTpass / ClubKonnect / MobileNig / Epin | - API Key / Token<br>- Secret Key<br>- Account Username/Password<br>- Dedicated Webhook URL | Built using `VTUProviderAdapter` abstraction. Fully functional internal Mock VTU Provider simulating network responses, pending states, and meter verification. |
| **SMS & OTP Delivery** | Termii / Sendchamp / Twilio | - API Key<br>- Registered Sender ID (e.g. "SaniPay") approved by NCC | Dev mode uses fixed OTP / local console logger; production routes through Termii/Sendchamp adapter. |
| **Push Notifications** | Firebase Cloud Messaging (Google) | - `google-services.json` (Android)<br>- `GoogleService-Info.plist` (iOS)<br>- Firebase Admin SDK service account private key (Backend) | Mock notification dispatcher during initial phases; Firebase configuration prepared for release phases. |
| **App Stores** | Google Play & Apple | - Google Play Console Developer Account ($25 one-off)<br>- Apple Developer Program Account ($99/year)<br>- Privacy Policy URL, Terms of Service URL, Support Email | Build pipelines and metadata files structured in accordance with Google Play & Apple App Store guidelines. |

---

## 8. Proposed Project Architecture

### 8.1 High-Level Architecture Diagram

```
+-------------------------------------------------------------+
|                      CLIENT LAYER                           |
|  +-------------------------------------------------------+  |
|  |             Flutter Mobile App (Android & iOS)        |  |
|  |  - Presentation: Material 3, BLoC / Clean State Mgmt  |  |
|  |  - Domain: Use Cases, Repositories, Entities          |  |
|  |  - Data: Secure Storage, Dio Client, Offline Cache   |  |
|  +-------------------------------------------------------+  |
+------------------------------+------------------------------+
                               | HTTPS / JSON (REST API)
                               v
+-------------------------------------------------------------+
|                     API GATEWAY / BACKEND                   |
|  +-------------------------------------------------------+  |
|  |        Node.js + TypeScript (Modular Architecture)     |  |
|  |  - Middlewares: Auth (JWT), RateLimit, Helmet, Cors  |  |
|  |  - Modules: Auth, Wallet, VTU, Billing, Support, Admin|  |
|  |  - Financial Engine: Double-Entry ACID Transactions   |  |
|  +-------------------------------------------------------+  |
|         |                                    |               |
|         v                                    v               |
|  +---------------+                 +--------------------+    |
|  |   Database    |                 | Provider Adapters  |    |
|  |  (MySQL/PG)   |                 | (Pluggable Design) |    |
|  |  - In Kobo    |                 +--------------------+    |
|  |  - Row Locks  |                           |               |
|  +---------------+            +--------------+-------------+ |
|                               |                            | |
|                               v                            v |
|                    [Payment Gateways]             [VTU Providers]
|                    - Paystack                     - VTpass       |
|                    - Flutterwave                  - ClubKonnect  |
|                    - MockPaymentGateway           - MockVTU      |
+--------------------------------------------------------------+
```

### 8.2 Provider Decoupling & Adapter Pattern
The system utilizes the **Adapter Pattern** for all external interactions:
- `IVTUProvider`:
  - `purchaseAirtime(request: AirtimeRequest): Promise<ProviderTransactionResult>`
  - `purchaseData(request: DataRequest): Promise<ProviderTransactionResult>`
  - `verifyMeter(request: MeterVerifyRequest): Promise<MeterDetails>`
  - `payElectricity(request: ElectricityRequest): Promise<ElectricityPaymentResult>`
  - `verifySmartcard(request: SmartcardVerifyRequest): Promise<SmartcardDetails>`
  - `payCableTV(request: CableRequest): Promise<CablePaymentResult>`
  - `queryTransaction(providerReference: string): Promise<TransactionStatusResult>`
- This ensures zero vendor lock-in. Switching from one provider to another requires only implementing an adapter class without modifying core business rules.

---

## 9. Proposed Workspace Folder Structure

```
c:\xampp\htdocs\data station\
├── backend/                             # Backend API (Node.js + TypeScript)
│   ├── src/
│   │   ├── config/                      # Environment and system settings
│   │   ├── common/                      # Constants, errors, utilities, logger
│   │   ├── database/                    # DB connection, migrations, seeds
│   │   │   ├── migrations/
│   │   │   └── seeders/
│   │   ├── modules/
│   │   │   ├── auth/                    # Registration, login, OTP, PIN, JWT
│   │   │   ├── users/                   # Profiles, KYC, preferences
│   │   │   ├── wallet/                  # Ledger, balances, funding, locks
│   │   │   ├── vtu/                     # Airtime & Data business logic
│   │   │   ├── bills/                   # Electricity & Cable TV logic
│   │   │   ├── transactions/            # History, receipts, status engine
│   │   │   ├── referrals/               # Referral codes, bonuses
│   │   │   ├── support/                 # Tickets, messages
│   │   │   ├── notifications/          # Push & In-app dispatch
│   │   │   └── admin/                   # Admin endpoints, analytics, pricing
│   │   ├── providers/                   # Pluggable Provider Adapters
│   │   │   ├── payment/
│   │   │   │   ├── payment.interface.ts
│   │   │   │   ├── paystack.adapter.ts
│   │   │   │   ├── flutterwave.adapter.ts
│   │   │   │   └── mock-payment.adapter.ts
│   │   │   └── vtu/
│   │   │       ├── vtu.interface.ts
│   │   │       ├── vtpass.adapter.ts
│   │   │       ├── clubkonnect.adapter.ts
│   │   │       └── mock-vtu.adapter.ts
│   │   ├── app.ts                       # Express application setup
│   │   └── server.ts                    # Server entry point
│   ├── tests/                           # Unit, integration & financial tests
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── mobile/                              # Flutter Cross-Platform Application
│   ├── lib/
│   │   ├── core/                        # Theme, constants, networking, storage
│   │   │   ├── config/                  # App name ("SaniPay") & environment
│   │   │   ├── network/                 # Dio client, interceptors, error handler
│   │   │   ├── theme/                   # Material 3 colors, typography, styles
│   │   │   └── utils/                   # Formatters (NGN Currency in Kobo), validators
│   │   ├── features/                    # Feature-based modular architecture
│   │   │   ├── auth/                    # Login, Register, OTP, PIN screens & logic
│   │   │   ├── dashboard/               # Home, navigation shell, quick actions
│   │   │   ├── wallet/                  # Balance card, fund wallet, ledger
│   │   │   ├── airtime/                 # Network selector, phone picker, buy flow
│   │   │   ├── data/                    # Data plans dynamic grid, buy flow
│   │   │   ├── electricity/             # DisCo selector, meter validation, buy flow
│   │   │   ├── cable/                   # Provider, smartcard validation, bouquet
│   │   │   ├── transactions/            # History list, filter, digital receipt
│   │   │   ├── referral/                # Share code, referral rewards list
│   │   │   ├── profile/                 # Account management, security, PIN change
│   │   │   └── support/                 # Tickets, FAQs, contact channels
│   │   └── main.dart                    # Application entry point
│   ├── test/                            # Unit and widget tests
│   ├── pubspec.yaml
│   └── assets/                          # Images, icons, vectors, fonts
│
├── docs/                                # Project Specifications & Guides
│   ├── PHASE_1_REQUIREMENTS_AND_PLANNING.md
│   ├── API_SPECIFICATION.md
│   └── DATABASE_SCHEMA.md
│
└── README.md                            # Setup and execution guide
```

---

## 10. Development Dependencies

### 10.1 Backend (Node.js & TypeScript)
- **Runtime & Language:** Node.js (`v24.x`), TypeScript (`v5.x`), `tsx` / `ts-node-dev` for live reloading.
- **Web Framework:** Express.js (`v4.x` / `v5.x`) with modular routing.
- **Database Access & ORM:** Prisma ORM or TypeORM/Kysely with MySQL/PostgreSQL support and database migrations.
- **Security & Validation:**
  - `bcryptjs` or `argon2` for password and transaction PIN hashing.
  - `jsonwebtoken` for access and refresh token signing.
  - `zod` for strict request payload validation.
  - `helmet` for secure HTTP headers.
  - `cors` for fine-grained origin control.
  - `express-rate-limit` for DDoS and brute-force prevention.
- **Logging & Monitoring:** `winston` and `morgan` for structured JSON logging with masking of sensitive fields.
- **Testing:** `jest`, `ts-jest`, and `supertest` for automated unit and integration tests.

### 10.2 Mobile Application (Flutter & Dart)
- **Framework:** Flutter SDK (3.x stable) with Dart 3.x.
- **State Management:** `flutter_bloc` or `flutter_riverpod` (predictable state transitions, testable).
- **Networking:** `dio` with custom interceptors for JWT injection, token refresh, and network retry.
- **Secure Storage:** `flutter_secure_storage` (backed by Android Keystore and iOS Keychain).
- **Biometrics:** `local_auth` for fingerprint and Face ID authentication.
- **UI & Helpers:**
  - `google_fonts` (modern typography like Inter / Outfit).
  - `intl` (Nigerian currency formatting: ₦).
  - `flutter_svg` for vector assets and telecom icons.
  - `share_plus` and `path_provider` for digital receipt sharing.

---

## 11. Verification Plan for Phase 1
- **Workspace Inspection:** Verified directory is empty and environment tools (Node, npm, git, XAMPP) identified.
- **Requirements Completeness:** All 17 core requirements from user prompt rigorously mapped to functional and non-functional specifications.
- **Safety Protocol Check:** Kobo integer accounting specified, double-entry ledger defined, zero client secrets policy confirmed, provider adapter abstraction designed.
- **Phase Milestone:** Stop and present Phase 1 deliverables to user for explicit review and approval before proceeding to Phase 2 (System Architecture).
