# SaniPay — Central Transaction History & Digital Receipt Engine Specification
## Phase 9: Transaction Ledger Querying, Multi-Parameter Filtering, and Digital Receipt Generation

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 9 — Central Transaction History & Digital Receipt Engine
- **Currency:** Nigerian Naira (`NGN`), stored in **Kobo** (`BigInt`)
- **Core Capabilities:**
  1. Paginated transaction history query with multi-attribute filtering.
  2. Free-text search matching references, recipient phone numbers, meter numbers, and smartcard IUCs.
  3. Digital receipt generator loading detailed sub-service metadata (tokens, units, bouquets, networks).
  4. Role-based ownership access control (customers view only their own records; admins view across all users).
  5. Transaction summary metrics (total funded, total spent, breakdown by service).

---

## 1. Architectural Principles

### 1.1 Central Master Transaction Record
Every financial transaction in SaniPay creates a master record in the `transactions` table, linked to dedicated sub-service tables:
```
Transaction (Master)
  ├── airtimeTransaction        ← Telecom network, recipient phone, discount
  ├── dataTransaction           ← Plan name, data volume/validity, recipient phone
  ├── electricityTransaction    ← DisCo, meter number, meter type, token, kWh units
  ├── cableTransaction          ← Provider, smartcard number, bouquet, renewal months
  ├── paymentTransaction        ← Gateway, gateway reference, channel, paid at
  ├── walletTransactions        ← Double-entry ledger audit records (balances before/after)
  └── transactionItems          ← Itemized line items (unit price, quantity, total)
```

### 1.2 Digital Receipt Envelope
Digital receipts are structured for immediate presentation in mobile app receipt canvases, email delivery, and downloadable PDF generation:
```json
{
  "receiptNumber": "SP_ELE_1725600000_XYZ89",
  "transactionId": "d9b3a184-d113-4608-8e6d-74d41286a999",
  "status": "SUCCESS",
  "type": "ELECTRICITY",
  "currency": "NGN",
  "faceValueFormatted": "₦5,000.00",
  "feeFormatted": "₦100.00",
  "totalPaidFormatted": "₦5,100.00",
  "createdAt": "2026-09-02T12:00:00.000Z",
  "serviceDetails": {
    "category": "ELECTRICITY",
    "discoName": "Ikeja Electric",
    "meterNumber": "01234567890",
    "meterType": "PREPAID",
    "customerName": "Adebayo Okafor",
    "token": "1234-5678-9012-3456",
    "units": "109.89 kWh",
    "receiptNumber": "RCP_1234567890"
  },
  "customer": {
    "fullName": "Musa Sani",
    "email": "musa@example.com",
    "phone": "08012345678"
  },
  "verificationSeal": "SANIPAY-CERT-XYZ89-D9B3"
}
```

### 1.3 Strict Ownership Access Control
- Customers requesting `GET /api/v1/transactions/:id` or `/reference/:reference` are authenticated via JWT.
- If the `transaction.userId` does not match the requester's ID and the user's role is not `SUPER_ADMIN` or `FINANCE_ADMIN`, access is denied with `403 Forbidden`.

---

## 2. API Endpoints Reference

### 2.1 History & Receipts Endpoints (`/api/v1/transactions`)

| HTTP Method | Route | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/transactions` | Bearer (JWT) | Paginated transaction history with type, status, date range, and text search filters. |
| `GET` | `/api/v1/transactions/summary` | Bearer (JWT) | Aggregated metrics: total funded, total spent, and counts by category. |
| `GET` | `/api/v1/transactions/reference/:reference` | Bearer (JWT) | Digital receipt lookup by transaction reference string. |
| `GET` | `/api/v1/transactions/:id` | Bearer (JWT) | Digital receipt lookup by transaction UUID or reference. |

---

## 3. Test Coverage & Verification

| Test Suite | File | Tests Count | Status |
|---|---|:---:|:---:|
| Transactions Unit Tests | `transactions.service.spec.ts` | 8 tests | ✅ PASS |
| Payments Unit Tests | `payments.service.spec.ts` | 9 tests | ✅ PASS |
| Airtime Unit Tests | `airtime.service.spec.ts` | 6 tests | ✅ PASS |
| Mobile Data Unit Tests | `data.service.spec.ts` | 5 tests | ✅ PASS |
| Electricity Unit Tests | `electricity.service.spec.ts` | 4 tests | ✅ PASS |
| Cable TV Unit Tests | `cable.service.spec.ts` | 4 tests | ✅ PASS |
| Wallet Unit Tests | `wallet.service.spec.ts` | 10 tests | ✅ PASS |
| Auth & OTP Unit Tests | `auth.service.spec.ts` | 13 tests | ✅ PASS |
| **Total Unit Tests** | | **59 / 59** | ✅ **100% PASS** |
| **E2E Tests** | `app.e2e-spec.ts` | **33 / 33** | ✅ **100% PASS** |
