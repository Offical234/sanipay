# SaniPay — Virtual Top-Up (VTU) & Utility Bills Specification
## Phase 7: Provider Abstraction, Airtime, Mobile Data, Electricity, and Cable TV

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 7 — VTU & Utility Bill Payment Services
- **Currency:** Nigerian Naira (`NGN`), computed in **Kobo** (`BigInt`)
- **Services Covered:**
  1. Telecom Airtime Top-Up (MTN, Airtel, Glo, 9mobile)
  2. Mobile Data Bundles (SME, Corporate Gifting, Direct Gifting, Regular)
  3. Electricity Bill Payments (11 DisCos, Prepaid Token Generation & Postpaid Receipting)
  4. Cable TV Subscriptions (DStv, GOtv, StarTimes, Showmax)
- **Architecture Pattern:** Provider Abstraction Layer (`IVTUProvider` contract)
- **Security Check:** 4-digit transaction authorization PIN verification for all purchases
- **Financial Safety:** Atomic wallet debits with automated rollbacks and refunds on provider failure

---

## 1. Architectural Principles

### 1.1 Provider Abstraction Layer
The backend decouples core business logic from any third-party VTU provider SDK (e.g. VTPass, ClubKonnect, Baxi, Reloadly) via the `IVTUProvider` interface:
```
backend/src/providers/vtu/
  ├── vtu.interface.ts          ← Interface contract for all VTU actions
  ├── vtu-provider.token.ts     ← VTU_PROVIDER dependency injection token
  └── mock-vtu.adapter.ts       ← Deterministic mock adapter for development & testing
```
Swapping between providers requires only changing the binding in `ProvidersModule` without touching any service or controller code:
```typescript
@Global()
@Module({
  providers: [
    {
      provide: VTU_PROVIDER,
      useClass: MockVTUAdapter, // Swap to VTPassAdapter or ClubKonnectAdapter for production
    },
  ],
  exports: [VTU_PROVIDER],
})
export class ProvidersModule {}
```

### 1.2 Two-Step Verification Flow for Utility Services
Utility services require validation prior to payment to prevent irreversible debits to invalid meters or smartcards:
1. **Meter / Smartcard Verification:**
   - User submits meter or IUC number to `/electricity/meter/verify` or `/cable/smartcard/verify`.
   - Provider verifies details and returns customer name and address/bouquet.
   - Backend caches the validated details in an in-memory session with a **10-minute TTL**.
2. **Authorized Payment:**
   - Payment endpoint checks the cache for an active validation session.
   - If unverified or expired, payment is rejected with `400 Bad Request`.
   - Once payment completes successfully, the verification cache is cleared.

### 1.3 Atomic Debit and Automatic Refund Guarantee
Every VTU purchase follows an atomic state machine:
```
1. Verify PIN & Idempotency
2. Atomically debit wallet in Prisma $transaction -> status: PROCESSING
3. Call VTU Provider:
   ├─ On Provider SUCCESS:
   │    Update transaction status: SUCCESS
   │    Deliver token / units / receipt / renewal date
   └─ On Provider FAILURE:
        Update transaction status: REFUNDED
        Auto-credit wallet with full amount + fee
        Throw BadRequestException with provider message
```

---

## 2. API Endpoints Reference

### 2.1 Airtime Endpoints (`/api/v1/airtime`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/airtime/networks` | Public | List active telecom operators & discount rates |
| `POST` | `/api/v1/airtime/purchase` | Bearer (PIN) | Purchase airtime with auto-applied discount |

### 2.2 Mobile Data Endpoints (`/api/v1/data`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/data/plans?network=MTN` | Public | List dynamic data plans with pricing and validity |
| `POST` | `/api/v1/data/purchase` | Bearer (PIN) | Purchase mobile data plan bundle |

### 2.3 Electricity Endpoints (`/api/v1/electricity`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/electricity/providers` | Public | List active DisCos & convenience fees |
| `POST` | `/api/v1/electricity/meter/verify` | Public | Verify meter number & retrieve customer info |
| `POST` | `/api/v1/electricity/pay` | Bearer (PIN) | Pay electricity bill & generate token |

### 2.4 Cable TV Endpoints (`/api/v1/cable`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/cable/providers` | Public | List cable TV providers & bouquet packages |
| `POST` | `/api/v1/cable/smartcard/verify` | Public | Validate smartcard/IUC number |
| `POST` | `/api/v1/cable/pay` | Bearer (PIN) | Renew cable bouquet subscription |

---

## 3. Test Coverage & Verification

| Test Type | File | Tests Count | Status |
|---|---|---|---|
| Unit Test | `airtime.service.spec.ts` | 6 tests | ✅ PASS |
| Unit Test | `data.service.spec.ts` | 5 tests | ✅ PASS |
| Unit Test | `electricity.service.spec.ts` | 4 tests | ✅ PASS |
| Unit Test | `cable.service.spec.ts` | 4 tests | ✅ PASS |
| Unit Test | `wallet.service.spec.ts` | 10 tests | ✅ PASS |
| Unit Test | `auth.service.spec.ts` | 13 tests | ✅ PASS |
| E2E Test | `app.e2e-spec.ts` | 25 tests | ✅ PASS |
| **Total** | | **67 tests** | ✅ **100% PASS** |
