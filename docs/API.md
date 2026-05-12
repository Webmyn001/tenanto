# API Reference

Base URL: `http://localhost:5000/api` (set via `NEXT_PUBLIC_API_URL` on the client).

All authenticated endpoints expect `Authorization: Bearer <jwt>`. JWTs are issued by `/auth/login` and `/auth/register`.

Roles: `student` · `corper` · `landlord` · `admin`. The middleware chain on each route is shown as `[auth, role(x), approved]`.

---

## Auth

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/auth/register` | — | `{ fullName, email, phone?, password, role, ...roleSpecific }` | `{ token, user }` |
| `POST` | `/auth/login` | — | `{ email, password }` | `{ token, user }` |
| `GET` | `/auth/me` | auth | — | `{ user }` |

Role-specific fields on register:
- **student**: `schoolName, schoolEmail, department, matricNumber`
- **corper**: `stateCode, stateOfService`
- **landlord**: none on register; submitted via verification flow

---

## Verification

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/verify/documents` | auth | `{ documents: [{kind,url,publicId}], selfieUrl? }` | `{ user }` |
| `POST` | `/verify/nin` | auth | `{ nin }` | `{ verified, name }` |
| `POST` | `/verify/school-email/start` | auth | `{ schoolEmail }` | `{ sent, devCode? }` |
| `POST` | `/verify/school-email/confirm` | auth | `{ code }` | `{ verified }` |

`documents.kind` ∈ `student_id` · `nysc_id` · `utility_bill` · `ownership_doc`. NIN is encrypted at rest with AES-256-CBC.

---

## Uploads

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/upload` | auth | multipart `file` | `{ url, publicId, type }` |
| `POST` | `/upload/many` | auth | multipart `files[]` | `{ files: [...] }` |

---

## Properties

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| `GET` | `/properties` | optional | `?school&state&area&minPrice&maxPrice&propertyType&furnishing&maxDistance&page&limit` | `{ items, total, page, averageRent }` |
| `GET` | `/properties/recommended` | auth | — | `{ items }` |
| `GET` | `/properties/mine` | landlord | — | `{ items }` |
| `GET` | `/properties/:id` | optional | — | `{ property, addressRevealed, addressGate }` |
| `POST` | `/properties` | landlord, approved | property fields | `Property` |
| `PATCH` | `/properties/:id` | landlord (owner) | partial property | `Property` |
| `POST` | `/properties/:id/publish` | landlord (owner) | — | `{ property, scoring }` |
| `POST` | `/properties/:id/feature` | landlord (owner) | — | `{ reference, authorizationUrl, amount }` |
| `POST` | `/properties/:id/feature/confirm` | landlord (owner) | `{ reference, propertyId }` | `{ property }` |
| `GET` | `/properties/:id/scoring` | auth (admin or owner) | — | `{ scoring }` |

`fullAddress` is only included on `GET /properties/:id` if `shouldRevealAddress(property, user)` returns true (paid inspection or active payment). Otherwise `addressGate: 'book_inspection'`.

---

## Inspections

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/inspections` | auth, approved | `{ propertyId, scheduledFor }` | `{ inspection, payment: { reference, authorizationUrl, amount } }` |
| `POST` | `/inspections/confirm-fee` | auth | `{ reference }` | `{ inspection, qrDataUrl }` |
| `GET` | `/inspections/scan/:qrToken` | landlord | — | `{ ok, inspection }` |
| `POST` | `/inspections/:id/rate` | auth | `{ rating, body, accuracy?, cleanliness?, landlordResponsiveness? }` | `{ ok, paymentUnlocked }` |
| `GET` | `/inspections/mine` | auth | — | `{ items }` |

Lifecycle: `booked → completed → tenantRated:true → paymentUnlocked:true`. Address visible for 48 h after fee paid.

---

## Chat

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/chat/conversations` | auth | `{ propertyId }` | `Conversation` |
| `GET` | `/chat/conversations` | auth | — | `{ items }` |
| `GET` | `/chat/conversations/:id/messages` | auth | — | `{ items }` |
| `POST` | `/chat/conversations/:id/messages` | auth | `{ body }` | `{ message, blocked, reasons }` |
| `POST` | `/chat/report-bypass` | auth | `{ conversationId, note? }` | `{ ok }` |

Real-time: connect Socket.IO at the API root with `auth.token=<jwt>`. Events: `join(conversationId)`, `message({conversationId, body})`. Server emits `message` and `blocked`. Every outbound message runs through `filterMessage` (regex + suspicious phrase + obfuscated phone detection); optionally `llmModerate` if `MODERATION_PROVIDER=openai` is set.

---

## Payments

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `GET` | `/payments/mine` | auth | — | `{ items: [...with agreement signature state...] }` |
| `POST` | `/payments/initiate` | auth, approved | `{ propertyId, paymentMode, installmentMonths?, contributors? }` | `{ payment, init }` |
| `POST` | `/payments/pay-slice` | auth | `{ paymentId, index?, contributorUserId? }` | `{ reference, authorizationUrl, amount }` |
| `POST` | `/payments/confirm` | auth | `{ reference, paymentId? }` | `{ payment }` |
| `POST` | `/payments/:id/move-in` | auth (tenant) | — | `{ payment, transfer }` |
| `POST` | `/payments/:id/dispute` | auth (tenant) | `{ reason }` | `{ payment }` |
| `POST` | `/payments/webhook` | (Paystack signature) | raw body | `{ received }` |

`paymentMode`: `full` · `installment` · `group`. Group requires `contributors: [{ user, amount }]`.

Escrow states: `awaiting_funding → partially_funded → fully_funded → released | refunded | disputed`.

---

## Agreements

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `GET` | `/agreements/by-payment/:paymentId` | auth (party) | — | `{ agreement }` |
| `GET` | `/agreements/:id` | auth (party) | — | `{ agreement }` |
| `POST` | `/agreements/:id/sign` | auth (party) | — | `{ agreement }` |
| `GET` | `/agreements/:id/pdf` | auth (party) | — | `application/pdf` (binary) |

Signing stamps `tenantSignedAt`/`landlordSignedAt` and a SHA-256 hash of `userId:paymentId:timestamp`. PDF rendering is on-demand via `pdfkit` and reflects current signature state.

---

## Roommate matching

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `GET` | `/roommates/profile` | student/corper | — | `{ profile }` |
| `POST` | `/roommates/profile` | student/corper, approved | profile fields | `{ profile }` |
| `GET` | `/roommates/matches` | student/corper | — | `{ matches: [{ profile, score, reasons }] }` |
| `POST` | `/roommates/invite` | student/corper, approved | `{ userId, message? }` | `{ ok, conversationId }` |

Match score (0-100): school/state (30) + dept (10) + budget overlap (≤25) + lifestyle compat (≤25) + gender pref (10, hard penalty on mismatch).

---

## Reviews & lookups

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| `POST` | `/reviews/tenancy` | landlord | `{ paymentId, rating, body }` | `{ ok }` |
| `GET` | `/reviews/user/:userId` | — | — | `{ items }` |
| `GET` | `/lookup/email` | auth | `?email` | `{ user }` |
| `GET` | `/lookup/schools` | — | — | `{ schools }` |

---

## Admin

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `GET` | `/admin/verifications` | admin | — | `{ items }` |
| `POST` | `/admin/verifications/:userId` | admin | `{ decision, notes? }` | `{ user }` |
| `GET` | `/admin/listings` | admin | — | `{ items }` |
| `POST` | `/admin/listings/:id` | admin | `{ decision, reason? }` | `{ property }` |
| `GET` | `/admin/disputes` | admin | — | `{ items }` |
| `POST` | `/admin/disputes/:id` | admin | `{ resolution }` | `{ payment }` |
| `GET` | `/admin/fraud` | admin | — | `{ items }` |
| `POST` | `/admin/users/:userId/suspend` | admin | `{ reason }` | `{ user }` |
| `GET` | `/admin/analytics` | admin | — | `{ users, listings, activeListings, payments, escrowedNaira }` |

`decision` ∈ `approve` · `reject`. `resolution` ∈ `release` · `refund`.

---

## Errors

All errors are JSON: `{ "error": "<message>", "stack"?: "<dev only>" }`. Common codes:

- `400` — validation error
- `401` — missing/invalid token
- `403` — wrong role / not approved / not a party / suspended
- `404` — not found
- `409` — conflict (already exists / already done)
- `429` — rate limited (auth routes only by default)
- `500` — server error

---

## Rate limits

`/auth/*` is rate-limited to 30 requests / 15 min / IP. Other routes are unbounded by default — add limits per the roadmap before production.
