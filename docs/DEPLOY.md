# Deployment guide

This guide covers shipping Tenanto to production. Choose Render / Railway / Fly.io / your own VPS — the patterns are the same.

## Prerequisites

- Node.js 20+ and a MongoDB Atlas cluster (or self-hosted Mongo with replica set + backups)
- A Paystack account (live keys + webhook URL configured)
- A Cloudinary account (or S3 with the same upload helper rewritten)
- A NIN verification provider (Dojah, VerifyMe, Youverify, or Smile Identity)
- An SMTP provider for transactional email (Postmark, Mailgun, Resend, AWS SES)
- Optional but recommended: Sentry for error tracking

## Environment variables

See `.env.example` in the repo root. Required for production:

```ini
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com
MONGO_URI=mongodb+srv://...
JWT_SECRET=<long random string, 64+ chars>
ENCRYPTION_KEY=<32-byte base64, used to encrypt NIN at rest>

# Provider keys
MOCK_THIRD_PARTY=false
NIN_PROVIDER=dojah                           # or verifyme | youverify | smileid
DOJAH_APP_ID=...
DOJAH_API_KEY=...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SELFIE_MATCH_PROVIDER=smileid                # or rekognition
SMILEID_PARTNER_ID=...
GOOGLE_MAPS_API_KEY=...

# Email
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Tenanto <noreply@yourdomain.com>

# Observability
SENTRY_DSN=https://...
SENTRY_TRACES_RATE=0.1
LOG_LEVEL=info

# Optional — LLM-based chat moderation
MODERATION_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Tunables
ESCROW_AUTO_RELEASE_DAYS=7
AUDIT_RETENTION_DAYS=2555                    # 7 years for AML
TRANSPORT_PER_KM_NAIRA=250
FEATURE_FEE_NAIRA=5000
```

## Pre-deploy checklist

- [ ] Generate strong `JWT_SECRET` and `ENCRYPTION_KEY` (`openssl rand -base64 48`)
- [ ] Set `MOCK_THIRD_PARTY=false` and verify each integration in staging first
- [ ] Configure Paystack webhook URL: `https://api.yourdomain.com/api/payments/webhook`
- [ ] Add the production frontend URL to `CLIENT_URL` (CORS) and to Paystack's allowed callbacks
- [ ] Read `docs/COMPLIANCE.md` and decide on PSSP vs custodian-bank for fund custody
- [ ] Run `npm run seed` against your **dev** DB only — production should start empty
- [ ] Verify Mongo Atlas backups are enabled and IP allowlist includes your servers

## Option 1: Docker Compose (single VPS)

```bash
git clone <repo>
cd tenanto
cp .env.example .env  # edit
docker compose up -d --build
docker compose logs -f backend
```

Reverse-proxy with Caddy or Nginx for HTTPS:

```caddy
api.yourdomain.com {
  reverse_proxy localhost:5000
}
yourdomain.com, www.yourdomain.com {
  reverse_proxy localhost:3000
}
```

## Option 2: Render / Railway

**Backend service:**
- Source: this repo, root `backend/`
- Build: `npm install`
- Start: `node src/server.js`
- Env vars: paste from `.env`
- Health check: `/health`

**Frontend service:**
- Source: `frontend/`
- Build: `npm install && npm run build`
- Start: `npm start`
- Env vars: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`

**MongoDB:** use Atlas (free tier through M30 is fine to start).

## Option 3: Fly.io

Each app needs its own `fly.toml`. Sketch:

```toml
# backend/fly.toml
app = "tenanto-api"
[http_service]
internal_port = 5000
force_https = true
[[http_service.checks]]
path = "/health"
```

```bash
fly launch --copy-config --name tenanto-api
fly secrets set JWT_SECRET=... PAYSTACK_SECRET_KEY=...
fly deploy
```

## Cron jobs

The app starts its own in-process cron scheduler at boot — see `src/jobs/index.js`. **In a multi-instance deployment you must run the scheduler on exactly one instance** (otherwise jobs run N times). Two patterns:

1. Set `JOBS_ENABLED=false` on all instances except one. Simple, brittle when you scale up.
2. Run a separate worker service with the same image but env `JOBS_ENABLED=true` and disable jobs on the web tier. Recommended.

Or graduate to BullMQ + Redis when you cross ~10k DAU.

## Backups

- MongoDB: enable Atlas continuous backups (point-in-time restore). Test a restore monthly.
- Cloudinary: enable backup storage in their dashboard, or sync to S3.
- Audit log: replicate to immutable storage if you need 7-year retention (S3 object-lock).

## Health checks & alerting

- `/health` returns 200 when the app is up
- Sentry catches errors automatically once `SENTRY_DSN` is set
- Wire pino logs to your log aggregator (Datadog, Better Stack, Grafana Loki)
- Monitor: Mongo connection lag, escrowed-naira growth, dispute rate, bypass-warning rate

## Scaling notes

- Stateless API tier — scale horizontally as needed
- Socket.IO needs sticky sessions or a Redis adapter when you go past one node
- Reconciliation job (see `docs/COMPLIANCE.md` §"Reconciliation") needs to land before you take serious volume

## Rollback plan

- Keep two previous container/image versions tagged
- For DB schema changes, the Mongoose models tolerate extra fields → forward-only is usually safe
- For breaking changes, ship a feature flag, dual-write, then cut over

## Security review before launch

- Run `npm audit` and resolve High/Critical
- Set up a `SECURITY.md` with a contact for vuln reports
- Enable Cloudflare in front of the API (DDoS + bot protection)
- Penetration test before public launch — at minimum cover auth, escrow release, address gate, chat filter
