# SaniPay — Notifications, Customer Support & Audit Security Specification
## Phase 12: Notification Dispatch, Support Ticket Workbench, Immutable Audit Logging, and System Security Hardening

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 12 — Notifications, Support & Security Hardening
- **Target Channels:** Push Notifications (Firebase Cloud Messaging), In-App Notification Inbox, SMS/Email Triggers
- **Support Workflows:** Customer Ticket Lifecycle, Messaging Threads, Priority Escalation
- **Compliance & Security:** Immutable Audit Logs, Helmet Security Headers, Global JWT & Role Guards

---

## 1. Notification Engine Architecture

The SaniPay notification subsystem ensures customers receive immediate, reliable transactional receipts and status alerts across multiple channels:

```
                      [ Event Trigger ]
               (Wallet Credit / Bill Success / OTP)
                             │
                             ▼
                 [ NotificationsService ]
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    [ In-App Notification ]      [ Push / External Channels ]
    • Stored in `notifications`   • Firebase Cloud Messaging (FCM)
    • Type: TRANSACTION_ALERT    • SMS Notification (Termii / Twilio)
    • Read / Unread status       • Transactional Email (Resend)
```

### 1.1 In-App Notification Lifecycle
1. **Creation:** Generated automatically upon completion of wallet transfers, VTU bill payments, and referral reward claims.
2. **Querying:** Customers fetch their paginated notification feed via `GET /api/v1/notifications` with unread counts.
3. **Acknowledgment:** Customers mark individual notifications or bulk mark all notifications as read via `PATCH /api/v1/notifications/:id/read` and `PATCH /api/v1/notifications/read-all`.

---

## 2. Customer Support Ticket Workbench

The customer support module facilitates transparent dispute reporting and resolution between customers and administrative support agents.

### 2.1 Support Ticket State Machine

```
      [ OPEN ] ──────────► [ IN_PROGRESS ] ──────────► [ RESOLVED ]
         │                        │                           │
         │                        │                           ▼
         └────────────────────────┴────────────────────► [ CLOSED ]
```

- **`OPEN`**: Initial state upon customer submission (specifying category: `TRANSACTION_DISPUTE`, `BILL_FAILURE`, `WALLET_ISSUE`, `GENERAL`).
- **`IN_PROGRESS`**: Assigned to an administrative support agent actively investigating the dispute.
- **`RESOLVED`**: Issue addressed (e.g. manual refund issued or token resent).
- **`CLOSED`**: Finalized ticket archived for reporting.

### 2.2 Endpoints & DTO Specifications
- **Create Ticket:** `POST /api/v1/support/tickets`
  - **Payload:**
    ```json
    {
      "subject": "Electricity token not generated for Ikeja Electric payment",
      "category": "BILL_FAILURE",
      "priority": "HIGH",
      "message": "Payment of ₦5,000 was successful (Ref: SP_ELE_1725600000_XYZ89) but no token was displayed.",
      "transactionId": "d9b3a184-d113-4608-8e6d-74d41286a999"
    }
    ```
- **Add Message:** `POST /api/v1/support/tickets/:id/messages`
- **Update Status:** `PATCH /api/v1/support/tickets/:id/status` (Restricted to `SUPPORT` and `SUPER_ADMIN`)

---

## 3. Immutable Audit Logging System

All sensitive operational, administrative, and financial actions generate an append-only row in the `audit_logs` table. Audit logs are write-only and cannot be updated or deleted by any API endpoint.

### 3.1 Audit Log Data Model

| Column | Data Type | Description |
|---|---|---|
| **`id`** | `UUID` | Primary key identifier. |
| **`actorId`** | `String` | ID of the authenticated user or admin executing the action. |
| **`actorType`** | `String` | `ADMIN`, `SYSTEM`, or `USER`. |
| **`action`** | `String` | Explicit action tag (e.g. `USER_STATUS_CHANGED_TO_SUSPENDED`, `MANUAL_REFUND_PROCESSED`). |
| **`targetEntity`** | `String` | Target domain table (e.g. `User`, `Transaction`, `Network`, `SystemSetting`). |
| **`targetId`** | `String` | Primary key of the affected target record. |
| **`oldValues`** | `Json?` | Snapshot of target record attributes prior to modification. |
| **`newValues`** | `Json?` | Snapshot of updated attributes and justifications. |
| **`ipAddress`** | `String?` | Originating client IP address. |
| **`createdAt`** | `DateTime` | Cryptographic timestamp of action execution. |

---

## 4. Platform Security & Hardening Controls

1. **Global Authentication Guard (`JwtAuthGuard`):**
   - Applied globally via `APP_GUARD`.
   - Every route in the application requires a valid Bearer JWT access token unless explicitly annotated with `@Public()`.
2. **Role-Based Authorization Guard (`RolesGuard`):**
   - Verifies user role against required handler/controller roles (`@Roles('SUPER_ADMIN', ...)`).
   - Rejects unauthorized roles with `403 Forbidden`.
3. **HTTP Header Hardening (`Helmet`):**
   - Configured in `main.ts` with Content Security Policy (CSP), X-Frame-Options (Clickjacking defense), and HSTS.
4. **CORS Isolation:**
   - Origins restricted to registered client domains (Mobile application deep links and Next.js Admin host).
5. **Strict DTO Validation (`ValidationPipe`):**
   - `whitelist: true`: Strips undeclared payload properties.
   - `forbidNonWhitelisted: true`: Returns `400 Bad Request` if unexpected fields are supplied.
   - `transform: true`: Automatically coerces types based on TypeScript decorators.

---

## 5. Test Verification Metrics

| Metric | Target | Result | Status |
|---|---|---|---|
| **Notifications Service Spec** | 100% Passing | **PASS** (`notifications.service.spec.ts`) | ✅ PASS |
| **Support Service Spec** | 100% Passing | **PASS** (`support.service.spec.ts`) | ✅ PASS |
| **Audit Log Integrity** | Verified | Tested via `AdminService.updateUserStatus` & `processRefund` | ✅ PASS |
| **Total Test Suite** | 93 / 93 Passing | **11 / 11 test suites passing (93 tests total)** | ✅ PASS |
