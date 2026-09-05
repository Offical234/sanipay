# SaniPay — Backend Project Setup Specification
## Phase 4: NestJS Modular API Architecture & Middleware

---

### Document Overview
- **Project Name:** SaniPay
- **Phase:** Phase 4 — Backend Project Setup
- **Framework:** NestJS (`v11.x`) + TypeScript (`v5.x`) + Express
- **Documentation:** Swagger / OpenAPI 3.0 (`/api/docs`)
- **Validation Engine:** `class-validator` & `class-transformer`
- **Security:** `helmet`, `cors`, and standardized error masking filters

---

## 1. Modular Application Architecture

The backend implements a modular, domain-driven structure registered in [`backend/src/app.module.ts`](file:///c:/xampp/htdocs/data%20station/backend/src/app.module.ts):

```
backend/src/
├── app.module.ts                        # Root module aggregating all domain slices
├── main.ts                              # Bootstrap, Helmet, CORS, Swagger, Pipes, Filters
├── common/
│   ├── constants/                       # Global system constants & error code catalog
│   ├── dto/                             # Generic ApiResponseDto & ApiErrorResponseDto
│   ├── filters/                         # Global HttpExceptionFilter
│   └── interceptors/                    # Global TransformInterceptor with BigInt serializer
├── config/                              # Typed configuration module
├── database/                            # Global DatabaseModule & PrismaService with row-locks
└── modules/
    ├── health/                          # Terminus health & readiness (/api/v1/health)
    ├── auth/                            # Registration, Login, OTP, JWT, PIN
    ├── users/                           # User profile & KYC management
    ├── wallet/                          # Wallet balances (Kobo), funding checkout
    ├── payments/                        # Paystack & Flutterwave webhook ingestion
    ├── airtime/                         # Telecom networks & VTU recharge
    ├── data/                            # Mobile data bundle catalog & purchase
    ├── electricity/                     # DisCo utility payments & meter verification
    ├── cable/                           # Cable TV subscriptions & smartcard verification
    ├── transactions/                    # Transaction history, digital receipts
    ├── referrals/                       # Referral rewards & code management
    ├── notifications/                   # In-app inbox & notification status
    ├── support/                         # Customer support tickets & message threads
    ├── admin/                           # Administrative overview, pricing margins, audits
    └── providers/                       # Pluggable provider adapter registration
```

---

## 2. Global Middleware & Security Pipeline

Order of execution for every incoming HTTP request:
1. **Helmet Middleware:** Sets secure HTTP headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`).
2. **CORS:** Controlled origins with allowed HTTP methods (`GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS`) and credentials.
3. **Global Prefix:** All REST routes prefixed with `/api/v1` (excluding Swagger docs at `/api/docs`).
4. **ValidationPipe:**
   - `whitelist: true` (strips unauthorized fields).
   - `transform: true` (automatically transforms payloads into DTO instances).
   - `transformOptions.enableImplicitConversion: true`.
5. **TransformInterceptor:**
   - Automatically wraps controller returns into `{ success: true, message: string, data: T }`.
   - **BigInt Serialization:** Safely converts 64-bit integer Kobo amounts to string/number format, preventing JSON serialization runtime crashes.
6. **HttpExceptionFilter:**
   - Intercepts all client, server, and validation exceptions.
   - Formats errors into `{ success: false, message: string, errorCode: string, errors?: Array<{ field, message }>, timestamp: string }`.
   - Prevents database or system stack traces from leaking to end users.

---

## 3. OpenAPI / Swagger 3.0 Integration

Interactive documentation is automatically generated from controller decorators and DTOs:
- **URL:** `http://localhost:3000/api/docs`
- **Authentication Scheme:** JWT Bearer Authentication (`bearerAuth`).
- **Exportable Spec:** Accessible via `/api/docs-json`.

---

## 4. Production Docker Configuration

Created multi-stage Docker build in [`docker/Dockerfile.backend`](file:///c:/xampp/htdocs/data%20station/docker/Dockerfile.backend):
- Stage 1: Dependency resolution and Prisma client generation.
- Stage 2: NestJS build compilation (`nest build`).
- Stage 3: Minimal runtime image running production bundle as non-root user.
