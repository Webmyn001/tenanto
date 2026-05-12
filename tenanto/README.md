# Tenanto — verified, agent-free housing marketplace

A scaffold for an agent-free student & corper housing platform in Nigeria, with verification, escrow, and aggressive anti-bypass controls.

> **Honest scope statement.** This is a working **foundation**, not a production-ready product. The distinctive, hard parts (address protection, anti-bypass chat, QR inspections, escrow state machine, role-based verification, admin review) are implemented and runnable. The third-party integrations (NIN, Paystack, Cloudinary) are wired with real interfaces but **mocked** behind `MOCK_THIRD_PARTY=true` so you can run the entire flow end-to-end without API keys. Swap in real keys to go live.

---

## Quick start

### Prerequisites
- Node.js 18+
- A running MongoDB (local or Atlas)

### Backend
```bash
cd backend
cp .env.example .env             # edit MONGO_URI, JWT_SECRET
npm install
npm run seed                     # creates 4 demo users + 1 listing
npm run dev                      # http://localhost:5000
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local # default points to localhost:5000
npm install
npm run dev                      # http://localhost:3000
```

### Demo logins (after `npm run seed`)
| Role     | Email                          | Password       |
|----------|--------------------------------|----------------|
| Admin    | admin@tenanto.local       | admin1234      |
| Landlord | landlord@tenanto.local    | landlord1234   |
| Student  | student@tenanto.local     | student1234    |
| Corper   | corper@tenanto.local      | corper1234     |

---

## Architecture

```
tenanto/
├── backend/                Express API + Socket.IO
│   └── src/
│       ├── server.js       Bootstrap (raw-body webhook, then JSON parser, then routes)
│       ├── config/db.js    Mongoose connection
│       ├── models/         User, Property, Inspection, Message, Payment, Agreement, Review
│       ├── middleware/     auth, role, upload (multer→Cloudinary), error
│       ├── controllers/    auth, verification, property, inspection, chat, payment, admin, upload
│       ├── routes/         All routes wired in routes/index.js
│       ├── utils/          jwt, qrcode, contactFilter, paystack (mocked), nin (mocked), cloudinary, seed
│       └── socket/         chatSocket — real-time chat with the same content filter
│
└── frontend/               Next.js 14 + Tailwind
    ├── pages/
    │   ├── index.js                            Landing
    │   ├── login.js, register.js               Auth
    │   ├── verify/index.js                     NIN, school email, doc upload
    │   ├── listings/index.js                   Browse + filters + average rent
    │   ├── listings/[id].js                    Detail with address gate
    │   ├── inspections/[id]/rate.js            Rate-and-unlock
    │   ├── inspections/scan/[qrToken].js       Landlord QR scan endpoint
    │   ├── chat/index.js, chat/[id].js         Conversations + thread (Socket.IO)
    │   ├── payments/new.js                     Initiate payment (full/installment/group)
    │   ├── payments/mock-checkout.js           Stand-in for real Paystack checkout
    │   └── dashboard/{tenant,landlord,admin}.js
    ├── components/         Layout, Navbar, ListingCard, FilterBar, AddressGate, VerificationBadge
    └── lib/                api (axios + auth), format
```

---

## The five core mechanics, mapped to code

The spec's central goal — **prevent users from bypassing the platform** — is implemented as five interlocking systems. Each one is summarized below with its file pointers.

### 1. Two-tier address protection
`area` is public; `fullAddress` is `select: false` and only returned by `propertyController.shouldRevealAddress(property, user)`, which checks for:
- the viewer being the landlord or an admin, **or**
- a paid inspection within the 48-hour visibility window, **or**
- an active payment in escrow

Look at: `backend/src/controllers/propertyController.js` and `frontend/components/AddressGate.js`.

### 2. QR-coded inspections
Booking creates an Inspection with a 48-byte hex `qrToken`. Tenant pays the refundable fee (₦2k–₦5k) → server marks `feeStatus: 'paid'` and reveals the address. The QR encodes a URL the landlord must open while authenticated as the listing owner. Endpoint: `GET /inspections/scan/:qrToken` flips status to `completed`.

Look at: `backend/src/controllers/inspectionController.js`, `backend/src/utils/qrcode.js`, `frontend/pages/inspections/scan/[qrToken].js`.

### 3. Anti-bypass chat filter
`backend/src/utils/contactFilter.js` runs on every outbound message (REST and Socket.IO). It detects:
- Phone numbers (formatted, raw 10+ digit runs, **and** word-form like "zero eight zero…")
- Emails
- External URLs (whitelisted domains only)
- Suspicious phrases ("WhatsApp", "pay direct", Nigerian bank names, "outside the platform")

Outcomes:
- `flagged + redacted`: message goes through with offending substring replaced
- `blocked`: original body is replaced with a warning, `bypassAttempts` increments on the conversation, `bypassWarnings` increments on the user, and at threshold the user is auto-suspended

The filter runs in `chatController.sendMessage` and `socket/chatSocket.js`. Test it at `/chat/<id>` after seeding.

### 4. Escrow state machine
`Payment.escrowStatus` walks: `awaiting_funding → partially_funded → fully_funded → released | refunded | disputed`. Released only when **the tenant confirms move-in** (`POST /payments/:id/move-in`). The Paystack webhook (`POST /api/payments/webhook`, raw-body verified) is the canonical source of truth; the `/confirm` endpoint exists for fast client polling after redirect.

Look at: `backend/src/controllers/paymentController.js`, `backend/src/models/Payment.js`. Supports full, installment, and group/split modes; auto-generates a tenancy agreement on funding.

### 5. Post-inspection lock-in
`Inspection.paymentUnlocked` is `false` until `POST /inspections/:id/rate` succeeds. `paymentController.initiate` refuses to start a Payment until that flag is `true`. So the flow is forced: book → pay fee → meet (QR scan) → rate → only then pay rent.

---

## What's wired vs what's mocked

| Concern                   | State                                                                 |
|--------------------------|-----------------------------------------------------------------------|
| Auth (JWT, bcrypt)        | ✅ Real                                                               |
| Role-based access control | ✅ Real, on every route                                               |
| All Mongoose models       | ✅ Real, with virtuals + pre-save validation                          |
| Address protection        | ✅ Real, enforced by `shouldRevealAddress`                            |
| Inspection + QR flow      | ✅ Real, end-to-end                                                   |
| Anti-bypass chat filter   | ✅ Real, REST and Socket.IO paths                                     |
| Escrow state machine      | ✅ Real (mocked transfers when `MOCK_THIRD_PARTY=true`)               |
| Auto-generated agreement  | ✅ Real — Markdown body + on-demand PDF rendering via pdfkit             |
| Admin console             | ✅ Verifications, listings, disputes, fraud feed, suspensions, analytics |
| E-signature collection    | ✅ Both parties sign; SHA-256 hash of (userId + paymentId + timestamp) stamped onto PDF |
| Move-in confirmation UI   | ✅ Tenant dashboard button → triggers escrow release                    |
| Paystack initialise/verify| 🟡 Real client; mocked when env flag is on                            |
| Paystack transfers        | 🟡 Real client; mocked when env flag is on                            |
| Paystack webhook          | 🟡 Signature verification is real; raw-body parser mounted correctly  |
| NIN provider              | 🟡 Stub for Dojah/VerifyMe/etc — drop in `realLookupNIN` and go       |
| Cloudinary uploads        | 🟡 Real if creds set; falls back to a no-op data-URL when absent      |
| School `.edu.ng` email    | 🟡 Code generated server-side; **email-send is not wired** (returns dev code)|
| AI fake-listing detection | ❌ Schema fields exist (`aiScores`); model not implemented           |
| AI price-fairness scoring | ❌ Schema fields exist; not implemented                               |
| Roommate matching         | ❌ Spec'd, not built — see roadmap                                    |
| Push notifications        | ❌ Not built                                                          |

---

## Running the full happy path against the mocks

After `npm run seed`:

1. Sign in as **landlord@…** → dashboard shows the seeded listing.
2. In another browser/incognito, sign in as **student@…**.
3. Open the listing → "Book inspection" → pick a date → submit.
4. You'll be redirected to `/payments/mock-checkout`. Click **Approve mock payment**.
5. Address now reveals on the listing page. Inspection appears under tenant dashboard.
6. As the **landlord**, open the inspections tab → click "Mark as met (scan)". (In production the landlord scans the QR; this link does the same thing.)
7. As the **student**, click "Rate & unlock pay" → submit ratings → "Pay rent" appears.
8. Pay rent → mock checkout → returns. Escrow goes `fully_funded` and an Agreement is created.
9. From tenant dashboard, the "Payments & escrow" section now shows the payment in **In escrow** status. An Agreement appears alongside it.
10. Click **Sign agreement** as the tenant. Switch to the landlord account, open the **Agreements** tab on their dashboard, click **Sign agreement** there too.
11. Click **Download PDF** on either side — the PDF is generated on the fly and includes both signature blocks with their SHA-256 hashes.
12. Back as the tenant, click **Confirm move-in**. Escrow flips to `released` and the landlord transfer fires (mocked).
13. As **admin@…** → dashboard tabs let you approve/reject pending things and review fraud feed.

Try sending `"call me on 08012345678"` in chat — it'll be blocked. Try `"send me the details on whatsapp"` — flagged. Try `"zero eight zero one two three four five six seven eight"` — also blocked.

---

## Production roadmap (what's left)

Before this can take real money, you need to ship:

**Must-have**
1. Wire a real NIN provider (Dojah, VerifyMe, Youverify, or Smile Identity). Drop credentials in `.env`, set `MOCK_THIRD_PARTY=false`.
2. Wire real Paystack — keys + webhook URL + add Paystack Transfer Recipient creation when a landlord verifies.
3. Email provider (Postmark/Mailgun/Resend) for school-email verification, password reset, and event notifications.
4. Selfie-vs-ID match — currently a manual admin step. Plug in Smile Identity or AWS Rekognition for automation.
5. Rate-limit beyond `/auth` — at minimum `/inspections`, `/payments`, `/chat`.
6. CBN-compliant escrow custody. **Holding tenant funds is regulated.** You'll likely need a partnership with a licensed PSSP — Paystack's escrow product or a custodian bank — rather than holding balances directly.

**Should-have**
7. AI fraud scoring on listings (image dedup against reverse-image-search, price-vs-area outlier model).
8. Roommate matching (filter by school + department + budget overlap).
9. Push notifications (FCM) for inspection reminders, payment due dates, dispute updates.
10. A proper observability stack — Sentry on both apps, structured logs, queryable audit log of every admin decision.

**Nice-to-have**
11. Replace the `Map` in `verificationController` with Redis so school-email codes survive restarts and scale across instances.
12. Move uploads to direct-to-Cloudinary signed uploads instead of routing through the API (saves bandwidth at scale).
13. Internationalization — Hausa, Yoruba, Igbo, Pidgin.

---

## Security notes

- Passwords are bcrypt-hashed with cost 12, never returned (`select: false`).
- All authenticated routes go through `requireAuth` → `requireRole` → (optionally) `requireApproved`.
- The Paystack webhook handler verifies `x-paystack-signature` against the raw body — make sure it's mounted *before* `express.json()` (it is).
- `helmet` and CORS are on.
- Sensitive fields (`password`, `fullAddress`) use `select: false` so they don't leak through generic queries.
- The contact filter is fail-safe: if regex misses a creative bypass, repeat offenders still trip the warning counter and get suspended.

If you find a security issue, please don't open a public issue — file it privately with whoever owns this codebase.
