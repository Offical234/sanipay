# SaniPay — Payment Gateways & Webhooks Engine Specification
## Phase 8: Pluggable Gateway Abstraction, Cryptographic Webhook Security, and Idempotent Wallet Crediting

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 8 — Payment Gateways & Webhook Engine
- **Currency:** Nigerian Naira (`NGN`), computed in **Kobo** (`BigInt`)
- **Supported Payment Gateways:**
  1. **Paystack:** Card, Bank Transfer, USSD, Apple Pay
  2. **Flutterwave:** Card, Bank Account, Mobile Money, Barter
  3. **Mock Sandbox Gateway:** Deterministic local and automated testing
- **Architecture Pattern:** Payment Gateway Port (`IPaymentGateway`) & Pluggable Adapters
- **Security:** HMAC-SHA512 raw-body cryptographic signature verification
- **Financial Safety:** Row-level locks, double-entry audit records, strict idempotency against duplicate webhook deliveries

---

## 1. Architectural Principles

### 1.1 Payment Gateway Port & Adapter Pattern
To avoid vendor lock-in, all payment processors implement the unified `IPaymentGateway` interface:
```
backend/src/providers/payment/
  ├── payment.interface.ts          ← Unified contract for payment processors
  ├── payment-gateway.token.ts      ← PAYMENT_GATEWAY dependency injection token
  ├── mock-payment.adapter.ts       ← Deterministic mock gateway for dev/testing
  ├── paystack.adapter.ts           ← Paystack adapter with HMAC-SHA512 verification
  └── flutterwave.adapter.ts        ← Flutterwave adapter with verif-hash validation
```

### 1.2 Webhook Cryptographic Security
1. **Raw Body Preservation:**
   - NestJS is initialized with `{ rawBody: true }` in `main.ts`.
   - The raw byte buffer is preserved to guarantee that whitespace or key-ordering variations in parsed JSON do not invalidate cryptographic signatures.
2. **Paystack Signature Verification:**
   ```typescript
   const expectedHash = crypto
     .createHmac('sha512', PAYSTACK_SECRET_KEY)
     .update(rawBodyBuffer)
     .digest('hex');

   const isValid = crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(signature));
   ```
   - Uses `crypto.timingSafeEqual` to prevent timing attack side-channels.
3. **Flutterwave Hash Verification:**
   - Validates that the HTTP header `verif-hash` exactly matches the secret verification hash.

### 1.3 Strict Financial Idempotency
Payment gateways frequently retry webhook deliveries due to network latency. To prevent double-crediting user wallets:
```
Incoming Webhook
  │
  ├─ Verify Cryptographic Signature (HMAC-SHA512)
  │    └─ If Invalid -> 401 Unauthorized
  │
  ├─ Fetch Transaction by Reference
  │    └─ If Not Found -> 404 Not Found
  │
  ├─ Check Transaction Status
  │    ├─ Already SUCCESS?
  │    │    └─ Idempotent Ignore: Acknowledge 200 OK without re-crediting
  │    │
  │    └─ Status PENDING?
  │         └─ In Atomic Prisma $transaction:
  │              1. Update Transaction status -> SUCCESS
  │              2. Create / Upsert PaymentTransaction record
  │              3. Atomically Credit Wallet (creditWallet)
  │              4. Insert immutable WalletTransaction CREDIT audit record
  │              5. Check & Qualify Referral reward if funding >= ₦1,000
  │              6. Return 200 OK with success confirmation
```

---

## 2. API Endpoints Reference

### 2.1 Webhooks & Verification Endpoints (`/api/v1/payments`)

| HTTP Method | Route | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/payments/webhooks/paystack` | Public (HMAC Verified) | Receives Paystack payment notifications (`charge.success`). |
| `POST` | `/api/v1/payments/webhooks/flutterwave` | Public (Hash Verified) | Receives Flutterwave payment notifications (`charge.completed`). |
| `POST` | `/api/v1/payments/webhooks/mock` | Public / Sandbox | Sandbox webhook trigger for local development and automated testing. |
| `GET` | `/api/v1/payments/verify/:reference` | Public / App Client | Queries payment processor to verify status and return official receipt. |

---

## 3. Test Coverage & Verification

| Test Suite | File | Tests Count | Status |
|---|---|:---:|:---:|
| Payments Unit Tests | `payments.service.spec.ts` | 9 tests | ✅ PASS |
| Airtime Unit Tests | `airtime.service.spec.ts` | 6 tests | ✅ PASS |
| Mobile Data Unit Tests | `data.service.spec.ts` | 5 tests | ✅ PASS |
| Electricity Unit Tests | `electricity.service.spec.ts` | 4 tests | ✅ PASS |
| Cable TV Unit Tests | `cable.service.spec.ts` | 4 tests | ✅ PASS |
| Wallet Unit Tests | `wallet.service.spec.ts` | 10 tests | ✅ PASS |
| Auth & OTP Unit Tests | `auth.service.spec.ts` | 13 tests | ✅ PASS |
| **Total Unit Tests** | | **51 / 51** | ✅ **100% PASS** |
| **E2E Tests** | `app.e2e-spec.ts` | **29 / 29** | ✅ **100% PASS** |
