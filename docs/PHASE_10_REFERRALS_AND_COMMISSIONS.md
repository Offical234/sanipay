# Phase 10 — Referrals & Bonus Commission Engine Specification

## 1. Architectural Overview & Business Model

The **SaniPay Referral Program** is a growth and customer retention engine designed to incentivize user acquisition via unique referral codes, shareable deep links, automated qualification triggers, and double-entry ledger settlements.

```
       [Referrer] (Code: SP-SANIPAY01)
           │
           │ Shares Link (https://sanipay.ng/ref/SP-SANIPAY01)
           ▼
       [Referee Registers] ──► Referral Record Created (Status: PENDING_QUALIFICATION)
           │
           │ Funds Wallet or Pays Bills (>= ₦1,000 / 100,000 Kobo)
           ▼
       [Qualification Hook]
           │
           ├──► Referral Status Updated to QUALIFIED
           └──► ReferralReward Record Created (20,000 Kobo, isPaid: false)
           │
           ▼
       [Referrer Claims Earnings] (POST /api/v1/referrals/claim)
           │
           ├──► Atomic ACID Database Transaction
           ├──► Referrer Wallet Credited (balanceKobo + 20,000 Kobo)
           ├──► Master Transaction Created (REFERRAL_BONUS, SUCCESS)
           ├──► WalletTransaction Created (CREDIT)
           ├──► ReferralReward.isPaid = true
           └──► Referral.status = REWARDED
```

---

## 2. Program Rules & Parameters

| Parameter | Value | Description |
|---|---|---|
| **Qualifying Threshold** | `100,000 Kobo` (₦1,000.00) | Minimum initial wallet funding or bill transaction amount required by the referee to trigger a commission payout. |
| **Reward Payout Amount** | `20,000 Kobo` (₦200.00) | Fixed commission credited to the referrer's wallet balance upon claiming. |
| **Referral Link Format** | `https://sanipay.ng/ref/{code}` | Universal deep link format resolving to mobile app or web onboarding. |
| **Data Privacy / Masking** | `0801***5678`, `John D.` | Referees' phone numbers and full names are masked in referral history for confidentiality. |

---

## 3. Referral Lifecycle & State Machine

```
[ PENDING_QUALIFICATION ]
         │
         │ Referee completes qualifying funding (>= 100,000 Kobo)
         ▼
    [ QUALIFIED ]
         │
         │ Referrer claims reward (POST /api/v1/referrals/claim)
         ▼
    [ REWARDED ]
```

1. **`PENDING_QUALIFICATION`**: Initial state created during registration when a new user enters a valid `referredByCode`.
2. **`QUALIFIED`**: Triggered automatically when the referee fulfills their first funding or transaction meeting or exceeding 100,000 Kobo (₦1,000.00). A `ReferralReward` record is generated.
3. **`REWARDED`**: Triggered when the referrer invokes the `/claim` endpoint. The rewards are atomically settled into their wallet ledger balance.

---

## 4. API Endpoints Reference

### 4.1 Referral Summary
**Endpoint:** `GET /api/v1/referrals/summary`  
**Authentication:** Required (Bearer JWT)  
**Description:** Returns the authenticated customer's referral code, shareable link, referee status counts, and earnings metrics in Kobo and formatted Naira.

**Example Response (200 OK):**
```json
{
  "success": true,
  "message": "Referral summary retrieved successfully",
  "data": {
    "referralCode": "SP-MUSA1234",
    "referralLink": "https://sanipay.ng/ref/SP-MUSA1234",
    "totalReferred": 5,
    "counts": {
      "pendingQualification": 2,
      "qualified": 1,
      "rewarded": 2
    },
    "unclaimedRewardsKobo": "20000",
    "unclaimedRewardsFormatted": "₦200.00",
    "totalEarnedKobo": "60000",
    "totalEarnedFormatted": "₦600.00"
  }
}
```

---

### 4.2 Referral History
**Endpoint:** `GET /api/v1/referrals/history?page=1&limit=20&status=QUALIFIED`  
**Authentication:** Required (Bearer JWT)  
**Description:** Paginated list of friends referred by the authenticated user with masked personal details and reward status.

**Query Parameters:**
- `page`: Page number (integer, min 1, default 1).
- `limit`: Items per page (integer, min 1, max 100, default 20).
- `status`: Optional filter (`PENDING_QUALIFICATION`, `QUALIFIED`, `REWARDED`).

**Example Response (200 OK):**
```json
{
  "success": true,
  "message": "Referral history retrieved successfully",
  "data": [
    {
      "id": "e4b10b02-6c2e-4b2a-89aa-594589d380e1",
      "refereeName": "Amina B.",
      "refereePhone": "0801***5678",
      "status": "QUALIFIED",
      "rewardAmountKobo": "20000",
      "rewardAmountFormatted": "₦200.00",
      "isPaid": false,
      "paidAt": null,
      "joinedAt": "2026-09-01T12:00:00.000Z",
      "updatedAt": "2026-09-02T14:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

---

### 4.3 Claim Rewards
**Endpoint:** `POST /api/v1/referrals/claim`  
**Authentication:** Required (Bearer JWT)  
**Description:** Atomically transfers all unpaid qualified bonuses (`isPaid: false`) into the customer's wallet balance using the double-entry accounting ledger.

**Request Body (Optional):**
```json
{
  "idempotencyKey": "claim-usr-1234-1788715739"
}
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "message": "Referral rewards successfully claimed and credited to your wallet",
  "data": {
    "reference": "SP_REF_CLM_1788715739308_N32VP",
    "amountClaimedKobo": "20000",
    "amountClaimedFormatted": "₦200.00",
    "rewardsCount": 1,
    "walletBalanceKobo": "120000",
    "walletBalanceFormatted": "₦1,200.00"
  }
}
```

---

### 4.4 Admin Overview & Leaderboard
**Endpoint:** `GET /api/v1/referrals/admin/overview`  
**Authentication:** Required (`SUPER_ADMIN`, `FINANCE_ADMIN`)  
**Description:** Platform-wide metrics, aggregate payout volume in Kobo, and top 10 referrers leaderboard.

**Example Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin referral program overview retrieved successfully",
  "data": {
    "totalReferrals": 50,
    "statusCounts": {
      "pendingQualification": 20,
      "qualified": 10,
      "rewarded": 20
    },
    "rewardsSummary": {
      "totalRewardsPaidCount": 20,
      "totalPaidKobo": "400000",
      "totalPaidFormatted": "₦4,000.00"
    },
    "topReferrers": [
      {
        "userId": "usr-admin-top",
        "fullName": "Top Lead",
        "email": "top@admin.com",
        "phone": "0801***3344",
        "referralCode": "TOP_LEAD",
        "totalReferrals": 15
      }
    ]
  }
}
```

---

## 5. Security, Anti-Fraud & Accounting Invariants

1. **Strict Idempotency:** Double claiming of referral rewards is structurally prevented by querying `WHERE isPaid = false` within an ACID database transaction.
2. **Double-Entry Ledger Integrity:** Claiming referral bonuses creates both a master `Transaction` of type `REFERRAL_BONUS` and a `WalletTransaction` of type `CREDIT`, recording both `balanceBeforeKobo` and `balanceAfterKobo`.
3. **No Self-Referral:** Registration logic prevents a user from using their own referral code (`referredById !== id`).
4. **Data Masking:** Referees' full phone numbers and identities are redacted in the customer portal to maintain privacy.

---

## 6. Test Verification Metrics

| Metric | Target | Result | Status |
|---|---|---|---|
| **Unit Tests** | 65+ | **70 / 70 passed** across 9 test suites | ✅ PASS |
| **End-to-End Tests** | 37+ | **38 / 38 passed** | ✅ PASS |
| **TypeScript Compilation** | 0 errors | **0 errors** (`nest build` code 0) | ✅ PASS |
