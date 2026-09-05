# SaniPay — Authentication & Authorization Module Specification
## Phase 5: Identity, JWT Security, Argon2id, OTP Engine, and RBAC

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 5 — Authentication & Authorization Module
- **Password & PIN Hashing:** Argon2id (Memory Cost: 64MB, Time Cost: 3 iterations)
- **Token Mechanism:** Dual JWT Strategy (15-minute Access Token, 30-day Rotatable Refresh Token)
- **Authorization:** Global `JwtAuthGuard` (opt-out via `@Public()`) + Global `RolesGuard` (RBAC)
- **Phone Verification & OTP:** Time-limited 6-digit OTP engine with rate limiting and sandbox mode

---

## 1. Architectural Highlights

### 1.1 Zero Plaintext Credentials
- **Password Security:** All passwords are required to be at least 8 characters with lowercase, uppercase, number, and special character. Hashed using **Argon2id** (`argon2.argon2id`).
- **Transaction PIN Security:** Every user is required to register an independent 4-digit financial transaction PIN (`^\d{4}$`). The PIN is salted and hashed using Argon2id independently from the login password.
- **PIN Challenge:** Required for all wallet withdrawals, fund transfers, and value purchases.

### 1.2 Dual Token Lifecycle & Revocation
- **Access Tokens:** Signed with `JWT_ACCESS_SECRET`, expire in 15 minutes. Decoded stateless by `JwtStrategy`.
- **Refresh Tokens:** Signed with `JWT_REFRESH_SECRET`, expire in 30 days. Hashed with Argon2id and stored in the database (`RefreshToken` model).
- **Rotation & Revocation:** When exchanging a refresh token via `POST /api/v1/auth/refresh-token`, the previous token is marked `isRevoked: true` and a new token pair is generated.

### 1.3 Account Lockout & Brute-Force Prevention
- Tracks `failedLoginAttempts` per user.
- Upon 5 consecutive failed login attempts, the account is temporarily locked (`lockoutUntil`) for **15 minutes**.
- Successful login automatically resets `failedLoginAttempts` to 0 and clears `lockoutUntil`.

---

## 2. API Endpoints Catalog

| HTTP Method | Route | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | `@Public()` | Register user, create wallet, hash credentials, dispatch OTP |
| `POST` | `/api/v1/auth/verify-otp` | `@Public()` | Verify 6-digit OTP, activate account, return token pair |
| `POST` | `/api/v1/auth/resend-otp` | `@Public()` | Re-issue fresh 6-digit OTP for phone number |
| `POST` | `/api/v1/auth/login` | `@Public()` | Authenticate via email or phone + password; enforces lockout |
| `POST` | `/api/v1/auth/refresh-token` | `@Public()` | Exchange valid refresh token for new access/refresh pair |
| `POST` | `/api/v1/auth/forgot-password` | `@Public()` | Request password reset OTP (enumeration-safe) |
| `POST` | `/api/v1/auth/reset-password` | `@Public()` | Reset password using 6-digit OTP and new password |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Retrieve profile details of the current authenticated user |
| `POST` | `/api/v1/auth/verify-pin` | Bearer JWT | Validate 4-digit PIN prior to executing sensitive transactions |
| `POST` | `/api/v1/auth/change-pin` | Bearer JWT | Update 4-digit PIN by verifying current PIN |

---

## 3. Role-Based Access Control (RBAC)

The system enforces strict role hierarchies based on the `UserRole` enum:
- `CUSTOMER` — Default end user; can fund wallet, purchase VTU services, manage profile.
- `AGENT` — Retail agent with wholesale pricing tier and bulk purchase privileges.
- `SUPPORT` — Customer support agent; manage support tickets and view user details.
- `FINANCE_ADMIN` — Admin with refund permissions and financial settlement access.
- `SUPER_ADMIN` — Full unrestricted system access, system settings, pricing margins.

Protected administrative routes utilize the `@Roles(...)` decorator:
```typescript
@Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
@Controller('admin')
export class AdminController { ... }
```

---

## 4. Test Verification Suite

All unit and end-to-end integration tests are passing:
- **Unit Tests (`src/modules/auth/auth.service.spec.ts`):**
  - Registration with duplicate email/phone conflict rejection.
  - Argon2id password verification, lockout after 5 failed attempts.
  - 6-digit OTP verification and failure paths.
  - 4-digit Transaction PIN matching and rejection.
  - 10/10 unit tests passing.
- **End-to-End Tests (`test/app.e2e-spec.ts`):**
  - System health check (`200 OK`).
  - Public discovery endpoints (`200 OK`).
  - Account registration with DTO regex validation (`201 Created` / `400 Bad Request`).
  - Successful login with token generation (`200 OK` / `401 Unauthorized`).
  - Protected profile route with JWT guard (`401 Unauthorized` without token, `200 OK` with valid Bearer token).
  - RBAC role guard enforcement (`403 Forbidden` for `CUSTOMER`, `200 OK` for `SUPER_ADMIN`).
  - 10/10 e2e tests passing.
