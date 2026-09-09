# Phase 14 — Production Deployment, DevOps, Security & Monitoring Specification

## 1. Architectural Overview & Deployment Topology

The **SaniPay** platform is deployed as a resilient, containerized multi-tier architecture capable of handling high transaction concurrency across Nigerian telecom aggregators and payment gateways.

```
                                      Internet Traffic
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │   Cloudflare CDN / WAF    │  (DDoS protection, SSL termination,
                               │   Edge Security Layer     │   rate-limiting & DNS)
                               └─────────────┬─────────────┘
                                             │ HTTPS (TLS 1.3)
                                             ▼
                               ┌───────────────────────────┐
                               │     Nginx Ingress /       │  (Reverse proxy, load balancing,
                               │   API Gateway Proxy       │   HTTP/2, gzip/brotli compression)
                               └───────┬───────────┬───────┘
                                       │           │
                     ┌─────────────────┘           └─────────────────┐
                     │ /api/v1/*                                     │ / (Admin UI)
                     ▼                                               ▼
       ┌───────────────────────────┐                   ┌───────────────────────────┐
       │   NestJS Backend API      │                   │   Next.js 16 Admin UI     │
       │   (Docker - Port 3000)    │                   │   (Docker - Port 3001)    │
       │   Multiple Node Replicas  │                   │   Standalone Node Runner  │
       └───────┬───────────┬───────┘                   └───────────────────────────┘
               │           │
       ┌───────┴───┐   ┌───┴──────────┐
       │           │   │              │
       ▼           ▼   ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │ Redis 7 AOF │ │ Prometheus  │
│ 16 Primary  │ │ BullMQ &    │ │ & Grafana   │
│ + Streaming │ │ Rate Limits │ │ Telemetry   │
│ Replica     │ │ Cache       │ │ Stack       │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## 2. Containerized Infrastructure & Multi-Stage Builds

### 2.1 Backend Containerization (`Dockerfile.backend`)
- **Base Image**: `node:24-alpine` (Minimal attack surface, < 150MB runner layer).
- **Builder Stage**: Compiles TypeScript using Nest CLI, generates Prisma client code, runs integrity validations.
- **Production Stage**: Excludes development dependencies (`npm ci --only=production`), executes under unprivileged system user (`USER node`).
- **Healthcheck**: Regular HTTP probes against `/api/v1/health` verifying DB connectivity, Redis connection, and memory saturation.

### 2.2 Admin Dashboard Containerization (`Dockerfile.admin`)
- **Standalone Mode**: Next.js 16 App Router configured with `output: 'standalone'`, bundling only necessary node modules into `server.js`.
- **Static Assets**: Pre-compressed CSS/JS chunks and SVG assets served with immutable cache headers (`max-age=31536000, immutable`).

### 2.3 Docker Compose Orchestration (`docker-compose.yml`)
- Orchestrates `postgres:16-alpine`, `redis:7-alpine`, `sanipay_backend`, and `sanipay_admin` across an isolated bridge network (`sanipay_network`).
- Healthcheck dependencies guarantee that the backend never starts until PostgreSQL passes `pg_isready` and Redis responds to `PING`.

---

## 3. Reverse Proxy & Nginx Configuration

Below is the production-grade Nginx configuration template implementing SSL/TLS termination, HTTP/2, security headers, and rate-limiting zones:

```nginx
# /etc/nginx/sites-available/sanipay.conf

# Upstream definitions
upstream backend_cluster {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

upstream admin_cluster {
    server 127.0.0.1:3001;
    keepalive 16;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

server {
    listen 80;
    server_name api.sanipay.ng admin.sanipay.ng app.sanipay.ng;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.sanipay.ng;

    # SSL Certificates (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/api.sanipay.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sanipay.ng/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; connect-src 'self' https://api.sanipay.ng;" always;

    # Gzip Compression
    gzip on;
    gzip_types application/json text/plain text/css application/javascript;

    # Auth Rate Limiting
    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=10 nodelay;
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # General API Routing
    location / {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Database Resilience, Backup & Disaster Recovery

### 4.1 PostgreSQL Persistence & Tuning
- **Storage**: Persistent Docker volume or dedicated NVMe EBS volumes with ext4 mount options `noatime,nodiratime`.
- **Connection Pool**: Prisma connection pool tuned to match CPU core allocation:
  $$\text{connection\_limit} = (\text{num\_physical\_cores} \times 2) + 4$$
- **Row-Level Locking**: High-contention wallet mutations execute inside `SELECT balance_kobo FROM wallets WHERE user_id = $1 FOR UPDATE` within an ACID transaction.

### 4.2 Backup Strategy
1. **Continuous Archiving**: WAL (Write-Ahead Logging) archiving to cloud object storage (AWS S3 / Wasabi / DigitalOcean Spaces) every 15 minutes.
2. **Daily Automated Snapshots**: Full logical dump via `pg_dump -Fc` executed at `02:00 UTC` with a 30-day rolling retention policy.
3. **Disaster Recovery (RTO / RPO)**:
   - **RPO (Recovery Point Objective)**: < 15 minutes (via WAL replays).
   - **RTO (Recovery Time Objective)**: < 30 minutes (automated restore script testing every month).

---

## 5. Monitoring, Metrics & Alerting Stack

### 5.1 Prometheus Metrics Exposition
The NestJS backend exposes an internal `/metrics` endpoint collecting:
- `http_requests_total{method, route, status_code}`
- `http_request_duration_seconds{route, quantile}`
- `vtu_purchase_requests_total{provider, status, network}`
- `wallet_balance_kobo{user_id="float_pool"}`
- `bullmq_queue_waiting_jobs{queue="webhooks"}`

### 5.2 Critical Alert Conditions (PagerDuty / Slack / Telegram)

| Alert Rule | Condition | Threshold | Severity |
| :--- | :--- | :--- | :--- |
| **High Error Rate** | HTTP 5xx responses / Total requests | > 2% over 5 mins | **Critical** |
| **Low VTU Success Rate** | Failed top-ups / Total requests | > 10% over 10 mins | **High** |
| **Float Reserve Exhaustion** | Provider balance in Kobo | < ₦50,000.00 | **High** |
| **Database Pool Saturation** | Active pool connections / Max pool | > 85% for 3 mins | **Warning** |
| **BullMQ Backlog** | Waiting jobs in queue | > 500 jobs | **Warning** |

---

## 6. Security Hardening & Compliance Checklist

- [x] **Zero Floating-Point Representation**: Balances and transactions are 100% integer Kobo to prevent rounding drift.
- [x] **Cryptographic Hash Security**: Passwords and PINs strictly use Argon2id with 64MB memory cost and 3 iterations.
- [x] **Idempotency Guarantees**: Every payment webhook and VTU purchase checks a unique idempotency key or reference before mutating balances.
- [x] **Webhook Signature Verification**: Paystack (`x-paystack-signature`) and Flutterwave (`verif-hash`) verified with constant-time HMAC comparison.
- [x] **Role-Based Access Control**: Hierarchical role enforcement (`SUPER_ADMIN`, `FINANCE_ADMIN`, `SUPPORT`, `AGENT`, `CUSTOMER`) on all administrative API surfaces.
- [x] **Data Redaction**: Sensitive personal identifiable information (PII) masked in referral screens, transaction logs, and external audit payloads.
