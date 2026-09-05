# SaniPay — Project Structure & Monorepo Architecture Proposal

---

## 1. Workspace Analysis

- **Workspace Path:** `c:\xampp\htdocs\data station`
- **Initial State:** Empty directory with Phase 1 & 2 requirements and architecture documents in `docs/`.
- **System Environment:**
  - OS: Windows 11 x64
  - Node.js: `v24.16.0` (Active)
  - npm: `v11.13.0` (Active)
  - Git: `v2.55.0` (Installed, ready for repository initialization)
  - XAMPP: MySQL/MariaDB and PHP available locally.
  - Containerization: PostgreSQL 16 and Redis 7 will be orchestrated via standard Docker / Docker Compose configurations for staging/production, while supporting isolated local services and mock test runners.

---

## 2. Technology Stack Alignment Confirmation

| Subsystem | Required Technology | Role in SaniPay |
| :--- | :--- | :--- |
| **Mobile Application** | **Flutter + Dart (Material 3)** | Cross-platform client for Android & iOS from a single codebase. |
| **Mobile State Management** | **Riverpod** | Reactive, compile-time safe, and testable state management. |
| **Mobile Navigation** | **GoRouter** | Declarative routing with deep-link support and auth redirect guards. |
| **Mobile Networking** | **Dio** | HTTP client with interceptors for JWT token injection and auto-refresh. |
| **Mobile Secure Storage** | **Flutter Secure Storage** | Storing JWTs, refresh tokens, and biometric session keys in Android Keystore / iOS Keychain. |
| **Mobile Push Notifications**| **Firebase Cloud Messaging (FCM)** | Transaction alerts, token delivery, and announcement dispatch. |
| **Backend API Framework** | **NestJS + TypeScript** | Enterprise modular REST API, dependency injection, and clean architecture. |
| **API Documentation** | **Swagger / OpenAPI** | Auto-generated interactive API docs (`/api/docs`). |
| **Validation** | **class-validator + class-transformer** | Strict DTO schema validation and payload transformation on all incoming requests. |
| **Primary Database** | **PostgreSQL** | Relational ACID storage with row-level locking (`FOR UPDATE`). |
| **Database ORM** | **Prisma ORM** | Type-safe queries, relational schema modeling, and migrations. |
| **Cache & Background Jobs** | **Redis + BullMQ** | Asynchronous job queues for webhooks, retries, notifications, and caching. |
| **Admin Dashboard** | **Next.js + TypeScript + Tailwind CSS** | Web-based administrative back-office communicating strictly with NestJS REST API. |
| **Payment Gateways** | **Paystack & Flutterwave** | Pluggable payment adapters with HMAC webhook verification and idempotency. |
| **VTU Aggregators** | **VTpass, ClubKonnect, MockVTU** | Pluggable VTU provider adapters for airtime, data, electricity, and cable TV. |
| **DevOps & Orchestration** | **Docker + Docker Compose** | Multi-service local and deployment environments (PostgreSQL, Redis, Backend, Admin). |

---

## 3. Proposed Workspace Monorepo Structure

```
c:\xampp\htdocs\data station\
├── .github/                             # CI/CD Workflows
│   └── workflows/
│       ├── backend-ci.yml               # Lint, build, and test NestJS API
│       ├── mobile-ci.yml                # Flutter test, analyze, and build check
│       └── admin-ci.yml                 # Next.js build and test check
│
├── backend/                             # NestJS + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma                # Complete PostgreSQL schema (Entities, Enums, Relations)
│   │   ├── migrations/                  # Generated SQL migrations
│   │   └── seed.ts                      # Development seed data (plans, billers, admin user)
│   ├── src/
│   │   ├── common/                      # Shared reusable primitives
│   │   │   ├── constants/               # Global constants (currency codes, error codes)
│   │   │   ├── decorators/              # Custom decorators (@CurrentUser, @Roles, @RequirePin)
│   │   │   ├── filters/                 # HttpExceptionFilter (Standard JSON envelope)
│   │   │   ├── guards/                  # JwtAuthGuard, RolesGuard, RateLimitGuard
│   │   │   ├── interceptors/            # LoggingInterceptor, TransformInterceptor
│   │   │   └── pipes/                   # ValidationPipe configurations
│   │   ├── config/                      # Environment configuration & Zod schema validation
│   │   ├── database/                    # PrismaService & connection lifecycle
│   │   ├── modules/                     # Modular domain feature slices
│   │   │   ├── auth/                    # Registration, Login, OTP, 4-digit PIN, Argon2, JWT
│   │   │   ├── users/                   # Profiles, KYC, user preferences
│   │   │   ├── wallet/                  # Double-entry ledger, row-level locks, balances in Kobo
│   │   │   ├── payments/                # Paystack & Flutterwave adapters, webhook signature verify
│   │   │   ├── airtime/                 # Airtime top-up, network detection, discount engine
│   │   │   ├── data/                    # Mobile data catalog, bundle purchasing
│   │   │   ├── electricity/             # DisCo bill payments, meter pre-validation, token delivery
│   │   │   ├── cable/                   # Cable TV, smartcard validation, bouquet upgrades
│   │   │   ├── transactions/            # Ledger records, transaction state machine, receipts
│   │   │   ├── referrals/               # Referral codes, deep links, commission rules
│   │   │   ├── notifications/           # Push notifications (FCM) & in-app inbox
│   │   │   ├── support/                 # Support ticket management
│   │   │   ├── admin/                   # Admin user controls, revenue reports, pricing margins
│   │   │   ├── providers/               # Pluggable adapter abstraction layer
│   │   │   │   ├── payment/             # IPaymentGateway (Paystack, Flutterwave, Mock)
│   │   │   │   └── vtu/                 # IVTUProvider (VTpass, ClubKonnect, Mock)
│   │   │   ├── queues/                  # BullMQ job processors (webhooks, notifications, retries)
│   │   │   └── health/                  # Terminus health checks (DB, Redis, Memory)
│   │   ├── app.module.ts                # NestJS root application module
│   │   └── main.ts                      # Application bootstrap, Swagger setup, CORS, Helmet
│   ├── test/                            # End-to-end and integration tests
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── .env.example
│
├── mobile/                              # Flutter Mobile Application (Android & iOS)
│   ├── android/                         # Android native project configuration & build.gradle
│   ├── ios/                             # iOS native project configuration & Podfile
│   ├── assets/                          # App icons, telecom logos, vector graphics
│   │   ├── icons/
│   │   ├── logos/                       # MTN, Airtel, Glo, 9mobile, DisCo logos
│   │   └── images/
│   ├── lib/
│   │   ├── core/                        # Application core
│   │   │   ├── config/                  # App branding ('SaniPay'), API base URLs
│   │   │   ├── constants/               # Colors, Spacing, Assets constants
│   │   │   ├── network/                 # Dio client, JWT token injector, Refresh interceptor
│   │   │   ├── router/                  # GoRouter configuration & route guards
│   │   │   ├── storage/                 # FlutterSecureStorage service
│   │   │   ├── theme/                   # Material 3 light and dark theme data
│   │   │   └── utils/                   # Money formatters (Kobo to NGN), Phone validators
│   │   ├── features/                    # Feature-first modular organization (Riverpod)
│   │   │   ├── auth/                    # Login, Register, OTP verification, PIN setup
│   │   │   ├── dashboard/               # Bottom navigation shell, home summary
│   │   │   ├── wallet/                  # Wallet balance, fund wallet modal, virtual accounts
│   │   │   ├── airtime/                 # Airtime purchase flow, contacts picker
│   │   │   ├── data/                    # Dynamic data bundle selection & purchase
│   │   │   ├── electricity/             # DisCo selection, meter validation, token receipt
│   │   │   ├── cable/                   # Provider selection, smartcard lookup, bouquet picker
│   │   │   ├── transactions/            # Transaction history list, filters, receipt modal
│   │   │   ├── referral/                # Referral code, rewards tracker, share action
│   │   │   ├── profile/                 # Profile management, PIN change, biometrics toggle
│   │   │   └── support/                 # Support ticket creation & ticket history
│   │   └── main.dart                    # Mobile entry point
│   ├── test/                            # Unit and widget tests
│   └── pubspec.yaml                     # Flutter dependencies (Riverpod, GoRouter, Dio, etc.)
│
├── admin/                               # Next.js Admin Dashboard (TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── app/                         # Next.js App Router
│   │   │   ├── (auth)/login/            # Secure admin login
│   │   │   ├── (dashboard)/
│   │   │   │   ├── overview/            # Real-time revenue, transaction volume, success rates
│   │   │   │   ├── users/               # User directory, KYC review, account status toggle
│   │   │   │   ├── transactions/        # Transaction ledger, filter by status, manual refund
│   │   │   │   ├── pricing/             # Dynamic margin and service fee configuration
│   │   │   │   ├── providers/           # Provider status, failover switches, API health
│   │   │   │   ├── support/             # Customer support tickets & response workbench
│   │   │   │   └── audit-logs/          # Immutable administrative audit trail
│   │   │   └── layout.tsx
│   │   ├── components/                  # Modern UI component library (Cards, Tables, Modals)
│   │   ├── lib/                         # Axios/Fetch client connecting to NestJS API
│   │   └── types/                       # TypeScript interfaces mirroring API response envelopes
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.example
│
├── docker/                              # Containerization & Infrastructure
│   ├── docker-compose.yml               # PostgreSQL 16, Redis 7, Backend, Admin
│   ├── Dockerfile.backend               # Multi-stage production build for NestJS
│   └── Dockerfile.admin                 # Multi-stage production build for Next.js
│
├── docs/                                # Project Specifications & Guides
│   ├── PHASE_1_REQUIREMENTS_AND_PLANNING.md
│   ├── PHASE_2_SYSTEM_ARCHITECTURE.md
│   └── PROJECT_STRUCTURE_PROPOSAL.md
│
├── .gitignore                           # Git ignore covering Node, Flutter, Next.js, Secrets
├── .editorconfig
└── README.md
```

---

## 4. Architectural Guarantees of Proposed Layout

1. **Clean Separation of Concerns:** The Flutter app and Next.js admin dashboard have zero direct access to PostgreSQL or Redis; all data mutations travel through the NestJS API with strict authentication and validation.
2. **Zero Client Secrets:** Private API tokens, webhook secrets, database credentials, and payment private keys are exclusively configured in `backend/.env`.
3. **Pluggable Providers:** The `backend/src/modules/providers/` directory houses standardized provider adapters implementing unified interfaces. Any payment gateway or VTU provider can be swapped or added without modifying core domain logic.
4. **Independent Testability:** Each directory (`backend`, `mobile`, `admin`) maintains its own test suites (`Jest` for NestJS, `flutter_test` for Flutter, and Next.js test utilities).
