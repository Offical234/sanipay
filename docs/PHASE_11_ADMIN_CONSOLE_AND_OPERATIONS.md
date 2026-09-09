# SaniPay — Admin Console & Back-Office Operations Engine Specification
## Phase 11: Administrative Governance, Financial Telemetry, Pricing Engine, and Dispute Resolution

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 11 — Admin Console, Operations & Financial Governance
- **Security & Authorization:** Role-Based Access Control (`SUPER_ADMIN`, `FINANCE_ADMIN`, `SUPPORT`)
- **Web Application Architecture:** Next.js (App Router), TypeScript, Tailwind CSS, Standalone Docker Runner
- **Core Capabilities:**
  1. Real-time financial telemetry (Gross Revenue, Today's Volume, Platform Wallet Holdings, Transaction Breakdown).
  2. Customer account governance (Search, KYC Inspection, Account Suspension / Activation with Audit Trail).
  3. Master transaction ledger querying across all telecom and utility providers.
  4. ACID-compliant manual dispute and refund engine with automatic wallet crediting.
  5. Telecom airtime discount cashback configuration (in Basis Points, BPS).
  6. Dynamic data bundle retail pricing and profit margin management.
  7. Platform system settings, maintenance switches, and feature flags.

---

## 1. Architectural Principles & Security Boundaries

```
                 ┌──────────────────────────────────────────────┐
                 │       Next.js 16 Admin Dashboard (Web)       │
                 │   (Port 3001 | Standalone Docker Container)  │
                 └──────────────────────┬───────────────────────┘
                                        │ HTTPS / Bearer JWT
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │           NestJS AdminController             │
                 │      @Roles('SUPER_ADMIN', ...)              │
                 └──────────────────────┬───────────────────────┘
                                        │
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │           NestJS AdminService                │
                 ├──────────────────────────────────────────────┤
                 │ • getDashboardOverview()                     │
                 │ • listUsers() & getUserDetails()             │
                 │ • updateUserStatus() (with AuditLog)         │
                 │ • processRefund() (ACID $transaction)        │
                 │ • listNetworks() & updateNetworkDiscount()   │
                 │ • listDataPlans() & updateDataPlanPrice()    │
                 │ • getSystemSettings() & upsertSystemSetting()│
                 └──────────────────────┬───────────────────────┘
                                        │
                                        ▼
                 ┌──────────────────────────────────────────────┐
                 │          PostgreSQL Relational DB            │
                 │    ACID Transactions, Row-Level Locking      │
                 └──────────────────────────────────────────────┘
```

### 1.1 Separation of Administrative Roles
The SaniPay administrative console enforces three distinct operational tiers via `@Roles()` guard:

| Role | Permitted Capabilities | Restricted Operations |
|---|---|---|
| **`SUPER_ADMIN`** | Unrestricted access across all operational domains, system settings, financial controls, and user account status mutations. | None. |
| **`FINANCE_ADMIN`** | Access to revenue metrics, financial ledgers, pricing adjustments, commission margins, and manual refund execution. | Cannot alter global system feature flags or modify administrative credentials. |
| **`SUPPORT`** | Access to user lookup, customer ticket workbench, transaction status verification, and account activation/suspension. | Cannot execute financial refunds or modify telecom pricing margins. |

---

## 2. API Endpoints & Request / Response Specifications

### 2.1 Operational Overview Telemetry
- **Route:** `GET /api/v1/admin/dashboard/overview`
- **Authentication:** Required (`SUPER_ADMIN`, `FINANCE_ADMIN`, `SUPPORT`)
- **Description:** Aggregates real-time financial metrics, volume distributions, and user counts via parallel database queries.

**Example Response (200 OK):**
```json
{
  "message": "Admin dashboard overview retrieved successfully",
  "data": {
    "users": {
      "total": 1240,
      "active": 1210,
      "suspended": 30,
      "pendingVerification": 0
    },
    "transactions": {
      "total": 15820,
      "today": 342,
      "thisMonth": 9210,
      "byStatus": {
        "successful": 15200,
        "failed": 480,
        "refunded": 110,
        "processing": 30
      }
    },
    "revenue": {
      "totalKobo": "791000000",
      "totalFormatted": "₦7,910,000.00",
      "todayKobo": "17100000",
      "todayFormatted": "₦171,000.00",
      "thisMonthKobo": "460500000",
      "thisMonthFormatted": "₦4,605,000.00"
    },
    "wallets": {
      "totalFundsHeldKobo": "235400000",
      "totalFundsHeldFormatted": "₦2,354,000.00"
    },
    "volumeByType": [
      {
        "type": "DATA_PURCHASE",
        "count": 8900,
        "volumeKobo": "445000000",
        "volumeFormatted": "₦4,450,000.00"
      },
      {
        "type": "AIRTIME_PURCHASE",
        "count": 4200,
        "volumeKobo": "210000000",
        "volumeFormatted": "₦2,100,000.00"
      },
      {
        "type": "ELECTRICITY_BILL",
        "count": 1600,
        "volumeKobo": "120000000",
        "volumeFormatted": "₦1,200,000.00"
      },
      {
        "type": "CABLE_SUBSCRIPTION",
        "count": 500,
        "volumeKobo": "16000000",
        "volumeFormatted": "₦160,000.00"
      }
    ],
    "recentActivity": [
      {
        "id": "c1f729b4-7d5a-4638-95d1-67823f5b0811",
        "reference": "SP_DAT_1725600100_XYZ42",
        "type": "DATA_PURCHASE",
        "status": "SUCCESS",
        "amountFormatted": "₦1,500.00",
        "user": {
          "name": "Ibrahim Musa",
          "phone": "08031234567"
        },
        "createdAt": "2026-09-09T18:45:12.000Z"
      }
    ]
  }
}
```

---

### 2.2 User Directory & Account Governance
- **Route:** `GET /api/v1/admin/users`
- **Query Parameters:** `page`, `limit`, `search`, `status`, `role`
- **Action:** `PUT /api/v1/admin/users/:id/status`
- **Payload:**
```json
{
  "status": "SUSPENDED",
  "reason": "Suspected anomalous transaction velocity flagged by fraud detection engine."
}
```
- **Audit Invariant:** Account status mutations automatically persist an immutable `AuditLog` row capturing the `actorId`, `targetEntity: 'User'`, `oldValues`, `newValues`, and justification timestamp.

---

### 2.3 Manual Dispute & Refund Resolution Engine
When third-party aggregators fail to deliver value (e.g. VTPass timeout) and automatic reconciliation fails, administrators can manually process a full wallet refund:

- **Route:** `POST /api/v1/admin/refunds/process`
- **Authentication:** Required (`SUPER_ADMIN`, `FINANCE_ADMIN`)
- **Payload:**
```json
{
  "transactionId": "d9b3a184-d113-4608-8e6d-74d41286a999",
  "reason": "VTPass operator failure — customer verified token was not delivered."
}
```

#### ACID Transaction Sequence:
1. Validates that the transaction has not already been refunded (`status !== 'REFUNDED'` and `transaction.refund == null`).
2. Creates an immutable `Refund` record with `status: 'COMPLETED'`, `amountKobo`, `reason`, and `processedBy: adminId`.
3. Updates original `Transaction.status = 'REFUNDED'`.
4. Creates a companion `Transaction` of type `REFUND` with reference `SP_RFND_{timestamp}_{rand}`.
5. Credits the user's `Wallet` balance atomically: `balanceKobo = balanceKobo + refundAmountKobo`.
6. Creates a `WalletTransaction` of type `CREDIT` documenting `balanceBeforeKobo` and `balanceAfterKobo`.
7. Writes an `AuditLog` entry detailing the financial adjustment.

---

### 2.4 Pricing & Margin Control
- **Networks Route:** `PATCH /api/v1/admin/pricing/networks/:id`
  - **Payload:** `{ "airtimeDiscountBps": 300 }` (Configures 3.00% customer cashback)
- **Data Plans Route:** `PATCH /api/v1/admin/pricing/data-plans/:id`
  - **Payload:** `{ "sellingPriceKobo": 145000, "isActive": true }` (Adjusts retail price to ₦1,450.00)

---

### 2.5 System Settings & Feature Flags
- **Route:** `GET /api/v1/admin/system-settings`
- **Route:** `PUT /api/v1/admin/system-settings`
- **Payload:**
```json
{
  "key": "MAINTENANCE_MODE",
  "value": "false",
  "description": "Global circuit breaker pausing bill checkout during aggregator maintenance."
}
```

---

## 3. Next.js Web Dashboard Implementation

The administrative web console is implemented as a standalone Next.js App Router application residing in `admin/`:
1. **Design System:** Custom dark-theme design tokens with midnight obsidian background (`#0B0F19`), emerald accents (`#10B981`), and glassmorphism (`backdrop-blur-16px`).
2. **State & Networking:** Standardized `api.ts` client with automatic Bearer token injection, response unwrapping, and 401 redirection to `/login`.
3. **Containerization:** Multi-stage `Dockerfile.admin` outputting an optimized standalone Node runner.

---

## 4. Verification & Metrics

| Metric | Target | Result | Status |
|---|---|---|---|
| **Admin API Unit Tests** | 100% Passing | **93 / 93 passed** across all 11 backend test suites | ✅ PASS |
| **Backend Build** | Zero Errors | **0 errors** (`nest build` code 0) | ✅ PASS |
| **Next.js Production Build** | Zero Errors | **0 errors, 0 warnings** (`next build` code 0) across 11 static routes | ✅ PASS |
| **Role Guard Enforcement** | Strict 403 on invalid role | Verified via `RolesGuard` override testing | ✅ PASS |
