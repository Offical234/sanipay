# SaniPay — Wallet & Double-Entry Financial Accounting Specification
## Phase 6: Core Financial Engine, Row-Level Locking, and P2P Transfers

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 6 — Wallet & Double-Entry Financial Accounting System
- **Currency:** Nigerian Naira (`NGN`)
- **Arithmetic Precision:** Unsigned 64-bit integer (`BigInt`) representing **Kobo** (`1 NGN = 100 Kobo`)
- **Ledger Model:** Immutable double-entry bookkeeping (`WalletTransaction` records)
- **Concurrency Protection:** ACID database transactions with row-level locks & optimistic versioning
- **Security Check:** 4-digit financial transaction authorization PIN mandated for all debit operations

---

## 1. Architectural Principles

### 1.1 Zero Floating-Point Currency Representation
To comply with financial accounting best practices and prevent rounding inaccuracies:
- All database monetary fields (`balance_kobo`, `ledger_balance_kobo`, `amount_kobo`, `fee_kobo`, `discount_kobo`, `net_amount_kobo`) use `BigInt`.
- API input DTOs validate positive integers with minimum funding/transfer constraints (minimum 10,000 Kobo = ₦100.00).
- Global `TransformInterceptor` automatically serializes 64-bit `BigInt` values to clean strings/numbers, preventing JSON serialization errors.
- Display values are rendered as formatted strings with Nigerian locale formatting (e.g. `₦5,000.00`).

### 1.2 Immutable Double-Entry Ledger
Every financial modification to a user's wallet automatically records an immutable ledger entry:
```
Wallet Mutation
  ├── Update Wallet: balanceKobo (New balance)
  ├── Update Wallet: version (Incremented)
  └── Create WalletTransaction:
        ├── type: CREDIT | DEBIT
        ├── amountKobo: BigInt
        ├── balanceBeforeKobo: BigInt
        ├── balanceAfterKobo: BigInt
        ├── transactionId: UUID (Linked to master Transaction)
        └── description: string
```

### 1.3 Concurrency Control & Double-Spending Prevention
- Atomic execution inside `prisma.$transaction()`.
- Optimistic version checking via `version` counter column.
- Row-level lock compatibility (`SELECT ... FOR UPDATE` via `PrismaService`).
- Pre-validation checks for `isLocked` status and balance sufficiency before balance deduction.

### 1.4 Peer-to-Peer (P2P) Wallet Transfers
- Enforces mandatory 4-digit transaction authorization PIN verification before execution.
- Disallows self-transfers (`recipient.id === sender.id`).
- Executes atomic transfer in a single `$transaction`:
  1. Creates master `Transaction` record (`type: WALLET_TRANSFER`, `status: SUCCESS`).
  2. Debits sender wallet and writes `DEBIT` ledger entry.
  3. Credits recipient wallet and writes `CREDIT` ledger entry.
- Idempotency key uniqueness prevents accidental duplicate transfers.

---

## 2. API Endpoints Reference

| HTTP Method | Route | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/wallet/balance` | Bearer JWT | Retrieve current wallet balance in Kobo and formatted Naira, ledger balance, and lock status |
| `POST` | `/api/v1/wallet/fund/initialize` | Bearer JWT | Initialize funding checkout session via Paystack, Flutterwave, or sandbox Mock gateway |
| `POST` | `/api/v1/wallet/transfer` | Bearer JWT | Execute P2P wallet transfer with PIN challenge, idempotency key, and double-entry ledger records |
| `GET` | `/api/v1/wallet/transactions` | Bearer JWT | Paginated audit ledger statement with running balance before and after each transaction |

---

## 3. Test Suite Verification Results

- **Unit Tests (`src/modules/wallet/wallet.service.spec.ts` & `src/modules/auth/auth.service.spec.ts`):**
  - **20 / 20 tests passing**
  - Balance retrieval, NGN locale formatting (`₦5,000.00`).
  - Safe credit addition and `CREDIT` ledger creation.
  - Safe debit deduction and `DEBIT` ledger creation.
  - Insufficient balance rejection (`BadRequestException`).
  - Locked wallet rejection (`ForbiddenException`).
  - Idempotency key duplicate rejection (`ConflictException`).
  - PIN verification enforcement on P2P transfers.
  - Self-transfer rejection.
- **End-to-End Tests (`test/app.e2e-spec.ts`):**
  - **15 / 15 tests passing**
  - `GET /api/v1/health` (`200 OK`)
  - `GET /api/v1/airtime/networks` (`200 OK`)
  - `POST /api/v1/auth/register` (`201 Created` / `400 Bad Request`)
  - `POST /api/v1/auth/login` (`200 OK` / `401 Unauthorized`)
  - `GET /api/v1/auth/me` (`401 Unauthorized` without token / `200 OK` with Bearer token)
  - `GET /api/v1/admin/dashboard/overview` (`403 Forbidden` for `CUSTOMER` / `200 OK` for `SUPER_ADMIN`)
  - `GET /api/v1/wallet/balance` (`200 OK`)
  - `POST /api/v1/wallet/fund/initialize` (`200 OK` / `400 Bad Request` on sub-minimum amounts)
  - `POST /api/v1/wallet/transfer` (`200 OK`)
  - `GET /api/v1/wallet/transactions` (`200 OK` paginated statement)
