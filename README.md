# SaniPay - Enterprise Nigerian VTU & Digital Services Platform

[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

SaniPay is an enterprise-grade, high-throughput digital services and Virtual Top-Up (VTU) platform engineered specifically for the Nigerian fintech ecosystem. It provides automated airtime recharge, data bundles (SME, Corporate Gifting, Direct Gifting), electricity utility bills (prepaid/postpaid DisCo tokens), cable TV subscriptions (DStv, GOtv, StarTimes, Showmax), peer-to-peer wallet transfers, and multi-tier affiliate referral rewards.

---

## Architecture Overview

```
                          ┌─────────────────────────────┐
                          │   Flutter Cross-Platform    │
                          │   Mobile App (iOS/Android)  │
                          └──────────────┬──────────────┘
                                         │ HTTPS / REST (api/v1)
                                         ▼
┌─────────────────────────┐       ┌─────────────────────────────┐       ┌─────────────────────────┐
│  Next.js 16 App Router  │       │       NestJS Backend        │       │   PostgreSQL 16 Engine  │
│  Admin Web Dashboard    │◄─────►│    Modular REST API Core    │◄─────►│  Double-Entry Ledger    │
│  (Dark Glassmorphism)   │       │   (Argon2id, JWT, Guards)   │       │  & Row-Level Locks      │
└─────────────────────────┘       └──────────────┬──────────────┘       └─────────────────────────┘
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │                               │
                                 ▼                               ▼
                      ┌─────────────────────┐         ┌─────────────────────┐
                      │    Redis / BullMQ   │         │  Third-Party Hub    │
                      │  Job Queues, Idemp. │         │  VTPass / ClubKonn. │
                      │  & Token Blacklist  │         │  Flutterwave Pay    │
                      └─────────────────────┘         └─────────────────────┘
```

### Core Architectural Pillars

1. **Strict Financial Accounting (Kobo Representation)**
   - All balances, transactions, and discount margins are strictly computed as **integer Kobo** (1 NGN = 100 Kobo). No floating-point arithmetic is permitted in the financial core.
   - Double-entry ledger audit trail (`WalletTransaction`) guarantees that balance mutations reconcile to zero.
   - Pessimistic row locking (`FOR UPDATE`) and database transactions (`prisma.$transaction`) prevent concurrent race conditions during rapid top-ups.

2. **Decoupled Telecom & Payment Adapters**
   - VTU provider abstraction interface allows hot-swapping or load balancing across **VTPass** and **ClubKonnect** without downtime.
   - Payment gateway abstraction handles **Flutterwave v3** checkout initialization and cryptographic HMAC-SHA256 webhook reconciliation.

3. **Multi-Role Administrative Cockpit**
   - Next.js 16 App Router dashboard featuring dark glassmorphic styling, live KPI tickers, telecom pricing tables, user management, and refund processing with maker-checker security controls.

4. **Modern Flutter Cross-Platform Client**
   - Riverpod state architecture with GoRouter declarative navigation.
   - Local authentication (Biometrics), Secure Storage, offline network retry with Dio interceptors, and Nigerian phone prefix detection.

---

## Monorepo Layout

```
sanipay/
├── .github/workflows/       # Automated CI/CD (Backend, Admin, Mobile)
│   ├── backend-ci.yml
│   ├── admin-ci.yml
│   └── mobile-ci.yml
├── admin/                   # Next.js 16 Admin Dashboard (Port 3001)
│   ├── src/app/             # App Router pages (/overview, /users, /pricing, etc.)
│   ├── src/components/      # Glassmorphic UI components & layout shell
│   └── src/lib/             # Auth storage and API client
├── backend/                 # NestJS 11 Modular Backend API (Port 3000)
│   ├── prisma/              # Schema definition, migrations, and seed script
│   ├── src/modules/         # Auth, Users, Admin, Wallet, VTU, Webhooks, Referrals
│   ├── src/providers/       # VTPass, ClubKonnect, Flutterwave adapters
│   └── test/                # Unit test suites (100% passing across 11 modules)
├── docker/                  # Multi-stage production containerization
│   ├── docker-compose.yml   # Full stack orchestration (Postgres, Redis, Backend, Admin)
│   ├── Dockerfile.backend   # Multi-stage Node 24 alpine build
│   └── Dockerfile.admin     # Standalone Next.js runner
├── docs/                    # Architectural Specifications (Phases 1 - 14)
│   ├── PHASE_1_REQUIREMENTS_AND_PLANNING.md
│   ├── ...
│   ├── PHASE_13_MOBILE_APP_ARCHITECTURE.md
│   └── PHASE_14_DEPLOYMENT_DEVOPS_AND_MONITORING.md
├── mobile/                  # Flutter Cross-Platform Mobile Client
│   ├── lib/core/            # Theme, Dio network layer, router, storage, helpers
│   ├── lib/features/        # Domain modules (Auth, Wallet, Airtime, Data, Bills)
│   └── test/                # Flutter unit & widget tests
└── .env.example             # Complete environment configuration template
```

---

## Quick Start (Docker Compose)

The fastest method to launch the full SaniPay platform locally is with Docker Compose:

```bash
# 1. Clone the repository and enter the directory
git clone https://github.com/your-org/sanipay.git
cd sanipay

# 2. Copy the sample environment file
cp .env.example .env

# 3. Spin up PostgreSQL, Redis, NestJS Backend, and Next.js Admin Dashboard
docker compose -f docker/docker-compose.yml up -d --build
```

### Exposed Services

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **Backend API** | `http://localhost:3000/api/v1` | NestJS REST API |
| **API Documentation** | `http://localhost:3000/docs` | Swagger / OpenAPI Spec |
| **Admin Dashboard** | `http://localhost:3001` | Next.js 16 Web Dashboard |
| **PostgreSQL** | `localhost:5432` | Relational Database (`sanipay_db`) |
| **Redis** | `localhost:6379` | Key-Value Cache & BullMQ Queue |

---

## Local Development Setup

### 1. Backend API (`backend/`)

Prerequisites: Node.js 20+, PostgreSQL 16, Redis 7.

```bash
cd backend

# Install dependencies
npm ci

# Configure local environment
cp ../.env.example .env

# Generate Prisma Client & Run Migrations
npx prisma generate
npx prisma migrate dev

# Seed master data & default administrative accounts
npm run prisma:seed

# Run automated unit test suites
npm test

# Start development server with hot-reload
npm run start:dev
```

### 2. Admin Dashboard (`admin/`)

Prerequisites: Node.js 20+.

```bash
cd admin

# Install dependencies
npm ci

# Configure environment (points to backend at http://localhost:3000/api/v1)
cp .env.example .env.local

# Run development server
npm run dev

# Or build production standalone bundle
npm run build
```

### 3. Mobile Client (`mobile/`)

Prerequisites: Flutter 3.19+ & Dart 3.3+.

```bash
cd mobile

# Fetch Flutter dependencies
flutter pub get

# Run analyzer
flutter analyze

# Run unit tests
flutter test

# Launch debug app on connected device / emulator
flutter run
```

---

## Default Administrative & Test Accounts

Running `npm run prisma:seed` creates the following baseline accounts:

| Role | Email | Password | Transaction PIN | Float Balance |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `admin@sanipay.ng` | `AdminSecurePassword123!` | `1234` | ₦1,000,000.00 |
| **FINANCE_ADMIN** | `finance@sanipay.ng` | `FinanceSecurePassword123!` | `1234` | ₦500,000.00 |
| **CUSTOMER (Demo)** | `user@sanipay.ng` | `UserSecurePassword123!` | `1234` | ₦50,000.00 |

*Note: All passwords and PINs are hashed using OWASP-compliant Argon2id before insertion.*

---

## Automated Testing & CI/CD

Continuous integration pipelines are configured in `.github/workflows/`:

- **Backend CI (`backend-ci.yml`)**: Linting, Prisma client generation, Jest unit tests (93 tests across 11 suites), and compilation.
- **Admin CI (`admin-ci.yml`)**: TypeScript verification and Next.js standalone static generation.
- **Mobile CI (`mobile-ci.yml`)**: Dart static analysis and Flutter widget/unit testing.

To run tests locally:
```bash
# Backend unit tests
cd backend && npm test

# Mobile unit tests
cd mobile && flutter test
```

---

## License & Support

Proprietary © SaniPay Technologies Ltd. All rights reserved.  
For technical support or commercial licensing, contact: `support@sanipay.ng`.
