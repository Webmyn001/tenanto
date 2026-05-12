# Phases & feature audit

This document walks the spec line-by-line, marks what's in the zip, and assigns the rest to one of three phases.

**Status legend:** ✅ shipped · 🟡 partial / mocked · ❌ not built

---

## Phase 1 — MVP (this zip)

A verified user can book → meet (QR) → rate → pay rent into mock escrow → both sign agreement → tenant confirms move-in → escrow releases. Anti-bypass mechanics enforce throughout. Mocked third-parties; everything else is real.

### Verification
- ✅ Student: full name, school (select from registry of 25 NG institutions), department, matric, ID upload, school email (.edu.ng, domain validated against registry, code emailed via SMTP), selfie
- ✅ Corper: full name, NIN (encrypted at rest), state code → state of service auto-derived, NYSC ID, selfie
- ✅ Landlord: full name, NIN, utility bill, ownership doc, selfie, admin approval gate

### Listings
- ✅ Title, description, full + installment pricing, area-only public, type, furnishing, distance, ≥ 5 videos / ≥ 8 images enforced at publish

### Discovery
- ✅ Filters: school, state, area, budget, type, **max-distance**
- ✅ School-based hubs (`nearSchools`) and corper state hubs (`servingStates`)
- ✅ Average rent in area
- ✅ Recommendations endpoint (heuristic — see Phase 3 for ML)
- 🟡 Transport estimate field exists; auto-calc deferred to Phase 2 (needs Maps API)

### Inspections
- ✅ Book → refundable fee → 48 h address window → unique QR token → landlord scan → tenant rate → payment unlock

### Chat
- ✅ In-app only via REST + Socket.IO
- ✅ Block phones (incl. word-form "zero eight zero…"), emails, external URLs
- ✅ Suspicious-phrase detection + abuse pattern detection
- ✅ Pluggable LLM moderation hook (`llmModerate`) — falls back to regex when no provider configured
- ✅ Auto-suspend after repeated bypass attempts

### Payments
- ✅ Full / installment / **group** modes (group UI now resolves contributors by email)
- ✅ Escrow state machine with `awaiting_funding → fully_funded → released | refunded | disputed`
- ✅ Move-in confirmation triggers transfer to landlord (Paystack-mocked)
- ✅ Dispute opens a frozen-escrow review queue for admin

### Anti-bypass
- ✅ Address gated until inspection paid; reopens for active payment
- ✅ Off-platform payment warnings on listing detail, chat, payment page, landing
- ✅ Bypass-warnings counter on user; auto-suspend at threshold
- ✅ **Terms of Service acceptance** required at register (`acceptTerms: true`)
- ✅ **Landlord Platform Rules** — separate stricter agreement that landlords must accept before publishing any listing (`POST /verify/landlord-rules`); legal text in `legal/LANDLORD_RULES.md`

### Reviews & trust
- ✅ Tenant rates landlord (post-inspection, gates payment)
- ✅ Landlord rates tenant (post-tenancy, after escrow released)
- ✅ Trust score recomputed on every review (verified base + review avg + tenure − warnings − suspension)
- ✅ Verified Landlord / Student-Friendly / NYSC Approved badges

### AI features (heuristic baselines, ready to be replaced by real ML)
- ✅ Authenticity (fake-listing) score: dup-image dedup, price outlier, account age, verification, bypass history
- ✅ Price fairness: z-score vs comparable peers in same area + property type
- ✅ Media quality: image/video count, description length, field completeness
- ✅ Chat moderation: regex + abuse patterns + LLM hook
- 🟡 Image/video content analysis: deferred to Phase 3 (computer vision model)
- 🟡 Apartment quality scoring beyond media: deferred (needs real-world quality signals from completed tenancies)

### Agreements
- ✅ Auto-generated on full funding
- ✅ Two-party e-signature with SHA-256 hash of `userId:paymentId:timestamp`
- ✅ On-demand PDF render via pdfkit, signature blocks stamped

### Roommate matching
- ✅ Profile model (school, state, dept, budget, sleep, cleanliness, social level, gender pref, smoker)
- ✅ Match score 0–100 with explanation reasons
- ✅ In-app invite (opens conversation, no contact info shared)
- ✅ Group applications via group payment mode

### Admin
- ✅ Verifications, listing review, disputes, fraud feed, suspensions, analytics
- ✅ Listing scoring detail (see *why* a listing was flagged)

### Business
- ✅ 10% landlord / 5% tenant commission
- ✅ Featured listings purchase flow (₦5,000 / 30 days, Paystack-backed)
- ✅ Inspection booking fee
- ✅ **Wallet / cashback** — 1% of rent credited on move-in confirmation; spendable on inspection fees and rent platform fees (the spec's "cashback or discount for in-app payment" incentive)
- ✅ **Subscriptions** — Free / Pro (₦5,000/mo) / Enterprise (₦50,000/mo) tiers via Paystack subscriptions; Pro+ unlocks unlimited active listings + priority placement
- ✅ **Priority access to verified listings** — `/properties` accepts `?verifiedOnly=true` and sorts by featured + authenticity score

### Security
- ✅ Bcrypt-hashed passwords (cost 12)
- ✅ NIN encrypted at rest (AES-256-CBC, deterministic hash for lookup)
- ✅ Helmet, CORS, rate-limited auth routes
- ✅ Paystack webhook signature verification with raw-body parser
- ✅ Role-based access control on every authenticated route

### Deliverables
- ✅ Full app
- ✅ Modular codebase
- ✅ `docs/API.md` — every endpoint documented
- ✅ `Dockerfile` for both apps + `docker-compose.yml` + `.env.example`

---

## Phase 2 — V1 (production cutover)

**Status: shipped in this zip.** Each item below has working code; activate by setting the relevant env vars (see `.env.example` and `docs/DEPLOY.md`).

| Item | Where in code | Status |
|---|---|---|
| Multi-provider NIN (Dojah / VerifyMe / Youverify / Smile Identity) | `utils/nin.js` | ✅ |
| Real Paystack — Transfer Recipient creation on landlord verification | `utils/paystack.js`, `controllers/verificationController.submitBankAccount` | ✅ |
| Real Cloudinary | `utils/cloudinary.js` (auto-detects creds) | ✅ |
| Selfie ↔ ID match (Smile Identity SmartSelfie / AWS Rekognition) | `utils/selfieMatch.js`, fired in `submitDocuments` | ✅ |
| Email provider live | `utils/email.js` (nodemailer SMTP, used in school-email + dispatchable elsewhere) | ✅ |
| LLM chat moderation hook | `utils/contactFilter.js` → `llmModerate` | ✅ |
| Auto distance + transport estimate | `utils/distance.js` (Google Maps + Haversine fallback), wired in `propertyController.publishListing` | ✅ |
| Trust score nightly job | `jobs/trustScoreJob.js` | ✅ |
| 7-day escrow auto-release | `jobs/escrowAutoReleaseJob.js` | ✅ |
| Featured-listing expiry job | `jobs/featuredExpiryJob.js` | ✅ |
| Audit log retention job | `jobs/auditCleanupJob.js` | ✅ |
| Rate limits beyond `/auth` | `middleware/rateLimit.js` (auth, inspection, payment, chat, upload, lookup) | ✅ |
| OpenAPI 3.1 spec + Swagger UI | `openapi.js`, `GET /api/docs` | ✅ |
| Trust badges automation | `utils/trustScore.js` (auto-grants `trusted_member` ≥70, `highly_rated` ≥85, `top_rated` ≥95) | ✅ |
| Webhook idempotency | `models/ProcessedWebhook.js`, used in `paymentController.webhook` | ✅ |
| Audit log for admin actions | `models/AuditLog.js`, `utils/audit.js`, hooked into every admin decision | ✅ |
| Audit-history admin endpoints | `GET /admin/audit`, `/admin/audit/user/:id`, `/admin/audit/target/:kind/:id` | ✅ |
| Manual job triggering for ops | `POST /admin/jobs/:name` | ✅ |
| Bank account onboarding for payouts | `POST /verify/bank-account`, `GET /verify/banks` | ✅ |
| Structured logging (Pino) + optional Sentry | `utils/logger.js`, `pino-http` request logs | ✅ |
| CBN compliance architecture doc | `docs/COMPLIANCE.md` | ✅ |
| Production deploy guide | `docs/DEPLOY.md` | ✅ |
| Backups | infra | ✅ `backend/scripts/backup.sh` + `restore.sh` + `docs/BACKUP.md` (Atlas + self-hosted) |
| Selfie liveness check | `utils/liveness.js` | ✅ multi-provider (Smile Identity, AWS Rekognition, iProov, mock); separate from selfie/ID match |
| Cloudinary content moderation | `utils/cloudinary.js` + `controllers/cloudinaryWebhookController.js` | ✅ async moderation (`aws_rek` / `webpurify` / `google_video_moderation`) with webhook + auto-flag-to-pending |
| BullMQ multi-instance jobs | `jobs/queue.js` | ✅ abstraction ships; auto-detects from `REDIS_URL`, falls back to node-cron |
| Production seed → import script | infra | ⚠️ adapt `utils/seed.js` per-deployment |

---

## Phase 3 — V2 (scale & expansion)

**Goal:** real AI/ML, mobile, multi-region, and the throughput work needed at 100k+ users.

### Real AI / ML
- **Computer-vision content analysis** — flag blurry / staged / dark / mismatched property photos. Use CLIP or a fine-tuned ResNet.
- **Reverse-image search dedup** — replace URL-equality dup detection with perceptual hashing (`pHash` / `dHash`) against all listings.
- **LLM-based listing description scoring** — coherence, completeness, suspicious phrasing, fake-amenity claims.
- **Embedding-based recommendations** — replace heuristic with a two-tower model trained on view → inspection → payment funnels.
- **Apartment quality scoring from real signals** — combine post-tenancy reviews, dispute rate, repeat-rental rate.

### Mobile
- React Native or Flutter app sharing the same API. QR scan flow is materially better on mobile (camera-native).
- Push notifications via FCM for inspection reminders, chat, payment due dates, escrow release events.

### Scale
- Redis for: school-email codes, session cache, rate-limit counters, BullMQ job queues.
- Direct-to-Cloudinary signed uploads (skip API bandwidth for video uploads).
- Read replicas for Mongo; aggregation indices for analytics queries.
- CDN in front of Cloudinary (optional) and frontend (Vercel/Cloudflare Pages handles this).

### Expansion
- **General renters** — drop student-gating in some hubs, add "professional" verification path (employer letter / utility-bill match).
- **Short-term rentals** — different booking model (per-night), Airbnb-style calendar, different escrow window.
- **Multi-country** — Ghana (use Ghana Card + Hubtel/Paystack GH), Kenya (use NCBA / M-Pesa daraja), South Africa. Each needs local KYC + payment rail.
- **Internationalization** — Hausa, Yoruba, Igbo, Pidgin, French (for francophone West Africa).
- **Co-living / managed buildings** — landlord might be a property-management company; multi-unit model.

### Trust & safety
- Insurance partnerships — rental damage coverage included in platform fee.
- Reference-check workflow for tenants (previous landlord attestation via email).
- Background-check partnerships for landlords with multiple flagged listings.

### Compliance
- NDPR (Nigerian Data Protection Regulation) — DPO, data inventory, ROPA, breach response runbook.
- KYC tiers — Tier 1 / 2 / 3 mapped to allowed payment volumes.
- Annual security audit by a third party. SOC 2 once volume justifies it.

---

## What's *not* in the zip and where it lives

If you grep for these to confirm:

- `nodemailer` is in `package.json`, used by `utils/email.js`, called from school-email verification.
- `pdfkit` is in `package.json`, used by `utils/agreementPdf.js`, called by `agreementController.downloadPdf`.
- AES-256-CBC encryption: `utils/encryption.js`, wired into `models/User.js` pre-save hook.
- LLM moderation hook: `utils/contactFilter.js` → `llmModerate` (currently falls through to `filterMessage`).
- Score persistence: `utils/scoring.js` → `scoreAndPersist`, called from `propertyController.publishListing` and `propertyController.getScoringDetail`.
- Trust score recompute: `utils/trustScore.js`, called from `inspectionController.rateAndUnlock` and `reviewController.rateTenant`.
- Roommate matching: `models/RoommateProfile.js`, `controllers/roommateController.js`, `pages/roommates.js`.
- School registry: `data/schools.js`, served via `GET /lookup/schools`, consumed by `components/SchoolSelect.js`.
- Featured listing flow: `propertyController.featureListing` + `confirmFeature`, button on landlord dashboard.
- Group payment lookup: `lookupController.lookupByEmail`, used by `pages/payments/new.js`.

Anything not in this list and not marked ✅ in Phase 1 is either Phase 2 (production cutover) or Phase 3 (scale).
