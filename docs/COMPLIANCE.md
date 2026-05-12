# CBN Compliance &amp; Escrow Architecture

> Holding tenant funds in Nigeria is regulated. This document explains what the platform is allowed to do today, what requires a partnership, and the architectural choices behind the escrow model.

## TL;DR

The codebase implements an **escrow state machine** that *describes* funds as held / released / refunded. The actual **money custody** must be done by a licensed entity. Two viable paths:

1. **PSSP partnership** — Use Paystack's escrow product (or a similar Payment Solution Service Provider) to hold funds against a settlement schedule. Recommended for v1.
2. **Custodian-bank partnership** — Open a designated escrow account with a Nigerian bank acting as custodian. More flexibility, more legal/operational overhead. Realistic at scale.

**Don't take real tenant money into a regular Paystack collections account and treat it as escrow yourself.** That's unlicensed money custody and exposes you to CBN enforcement plus civil liability if you go insolvent.

## Where the platform sits today

| Layer | Status | Notes |
|---|---|---|
| Payment initiation (Paystack `/transaction/initialize`) | ✅ implemented | `utils/paystack.js` |
| Funds collection | 🟡 logically in escrow | In production, money sits in your Paystack collections balance until you transfer. **That is not legally escrow.** |
| Escrow state machine | ✅ implemented | `models/Payment.js` — `awaiting_funding → fully_funded → released | refunded | disputed` |
| Release on move-in | ✅ implemented | `paymentController.confirmMoveIn` → `transferToLandlord` |
| Auto-release after window | ✅ implemented | `jobs/escrowAutoReleaseJob.js` — 7 days default |
| Webhook idempotency | ✅ implemented | `models/ProcessedWebhook.js` |
| Transfer Recipients | ✅ implemented | `verificationController.submitBankAccount` creates a Paystack recipient at landlord verification |
| Funds custody | ❌ not regulator-safe alone | Use a PSSP partner or designated escrow account |
| Reconciliation ledger | ❌ not built | See §"Reconciliation" below |
| KYC / KYB tiers | 🟡 partial | We collect NIN + utility bill + ownership doc. Tier-2 / Tier-3 limits not yet enforced |

## Recommended setup for v1 (PSSP partnership)

The flow:

1. Tenant pays through Paystack as today.
2. Funds settle to a **dedicated business account that exists solely for tenant funds** — not your operating account. Paystack supports multiple settlement accounts.
3. Off-platform: contract Paystack's escrow product (or an equivalent), so funds in that account are flagged as escrowed and Paystack will only release on signed instructions.
4. When `confirmMoveIn` fires, our `transferToLandlord` instructs Paystack to release the funds to the landlord's pre-registered Transfer Recipient.
5. When auto-release fires (7 days after move-in, no dispute), same thing.
6. When a dispute fires, escrow is locked until admin resolution.

This gives you regulatory cover (Paystack is the licensed PSSP), avoids you holding balances directly, and matches the state machine the code already implements.

## Reconciliation

You need a daily reconciliation job that compares:
- Sum of `Payment.totalDue` where `escrowStatus ∈ {fully_funded, partially_funded}`
- Reported balance of the escrow settlement account
- Outstanding transfer instructions

If they diverge by more than a few naira (rounding), pause auto-release and alert ops. This isn't built yet — add it under `jobs/reconciliationJob.js` for production.

## KYC tiers

Map to CBN Tier-1 / Tier-2 / Tier-3 limits:
- **Tier 1** (BVN/NIN only, no docs) — daily transaction cap ₦50,000, balance cap ₦300,000
- **Tier 2** (NIN + utility bill + photo) — daily ₦200,000, balance ₦500,000
- **Tier 3** (full KYC including landlord ownership doc) — uncapped, subject to AML monitoring

Today the platform only allows transactions for Tier-3 (full verification). When you expand to Tier-1 / Tier-2, enforce these limits in `paymentController.initiate`.

## Data residency

NDPR (Nigerian Data Protection Regulation) and the new NDP Act require:
- Data of Nigerian residents stored in NG or in jurisdictions with adequate protection
- Appoint a Data Protection Officer once you cross 1,000 data subjects
- Maintain a Records of Processing Activities (ROPA) document
- Run a Data Protection Impact Assessment (DPIA) before launch
- File annual audits with NDPC

The encryption-at-rest pattern in `utils/encryption.js` (AES-256-CBC for NIN) is required, not optional. Add the same treatment for any other PII you persist (BVN, account numbers — currently stored plaintext, fix this before launch).

## Audit log + AML

Every admin decision is captured in `models/AuditLog.js`. For AML:
- Add suspicious-transaction reporting hooks (any single payment > ₦5M, or aggregate user volume > ₦10M / month, gets flagged for review)
- Retain audit logs for 7 years (override `AUDIT_RETENTION_DAYS=2555` in env)
- Daily backup to immutable storage (S3 with object-lock, GCS with retention policy)

## Insurance

A small percentage of escrow disputes will end in fraud you can't recover. Consider:
- Self-insurance reserve: hold back 1-2% of platform fees in a reserve account
- Third-party insurance: rental fraud cover via Hygeia, Leadway, or Old Mutual
- Communicate clearly to users what is and isn't covered

## When to revisit

This architecture is fine through ~₦500M in monthly volume. Beyond that:
- Move to a designated custodian-bank account (more flexibility, lower per-transaction fees)
- Consider a Microfinance Bank licence if you want to offer rent-financing
- Hire a full-time compliance officer
