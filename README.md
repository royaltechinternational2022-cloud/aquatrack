# AquaTrack — Water Sales Management System

A mobile-first Progressive Web App for a water-selling business in Sri Lanka. Two
employees register sales in ~10 seconds each; the owner gets a real-time
dashboard, transaction history with corrections/audit log, and automatic
daily/weekly/monthly email reports.

Currency: LKR (Rs.) · Timezone: Asia/Colombo

## Stack

- **Next.js 16 (App Router, TypeScript, Tailwind)** — UI + API routes
- **Prisma + SQLite** (`prisma/schema.prisma`) — swap the `DATABASE_URL` provider for Postgres/MySQL in production without touching app code
- **jose + bcryptjs** — JWT session cookies, hashed passwords, role-based middleware (no third-party auth service)
- **Recharts** — dashboard charts
- **Nodemailer** — Gmail SMTP for automatic report emails
- **Manual service worker + manifest** — installable PWA (no build plugin)

## Getting started

```bash
npm install
cp .env.example .env   # fill in AUTH_SECRET, CRON_SECRET, and SMTP_* when ready
npx prisma migrate dev # creates prisma/dev.db and applies the schema
npm run db:seed        # creates the owner + 2 employee accounts below
npm run dev
```

Seeded accounts (change these passwords after first login — there's no
in-app "change my own password" screen yet, so ask an admin to reset it
via Team → employee → Reset Password):

| Role     | Username    | Password      |
|----------|-------------|---------------|
| Owner    | `owner`     | `Admin@123`   |
| Employee | `employee1` | `Employee@123`|
| Employee | `employee2` | `Employee@123`|

## Installing as an app (PWA)

Open the deployed URL on a phone:
- **Android (Chrome)**: menu → "Install app" / "Add to Home screen"
- **iPhone/iPad (Safari)**: Share → "Add to Home Screen"

No App Store / Play Store listing needed. Icons and manifest live in
`public/icons/` and `public/manifest.webmanifest` (regenerate icons with
`python3 scripts/generate_icons.py`).

## Automatic email reports

Report delivery is driven by `POST /api/cron/reports`, guarded by the
`CRON_SECRET` header (`x-cron-secret`). It's idempotent — call it as often as
you like (every 5–15 minutes is plenty); it only sends once per
(report type, period, recipient) and retries failed sends automatically,
logging every attempt to the `EmailLog` table (visible under **Reports** in
the admin app).

Two ways to drive it:

1. **Platform cron** (e.g. Vercel Cron) — point it at `POST /api/cron/reports`
   with the `x-cron-secret` header set to your `CRON_SECRET`.
2. **Your own scheduler** — run `npm run cron:reports` on an interval (system
   crontab, pm2, etc.) with `APP_URL` and `CRON_SECRET` set in the environment.

Recipients, send times, and which reports are enabled are all configured
under **Settings → Email Reports** in the admin app (`ReportSettings` table).

Gmail SMTP: use an [App Password](https://support.google.com/accounts/answer/185833)
for `SMTP_PASS`, not your normal Gmail password (Google requires 2FA + app
passwords for SMTP).

## Architecture notes (why things are shaped this way)

- **Pricing modes** (`PricingSetting.pricingMode`): `MANUAL` (V1 default —
  employee enters liters + amount), `PER_LITER` (owner sets a fixed price,
  amount is calculated automatically), and `PRODUCT` (reserved for future
  multi-product/customer-category pricing — schema-ready, not exposed in the UI yet).
- **Price anomaly detection** (`src/lib/pricing.ts`): compares a manually
  entered rate against the recent average and asks the employee to confirm
  if it's out of range. It never auto-corrects the amount.
- **Idempotent sale submission**: the client generates a `requestId` (UUID)
  once per sale attempt; resubmitting the same `requestId` (double-tap, retry
  after a dropped connection) returns the original sale instead of creating a
  duplicate. The sale screen shows "SAVING…" until the server confirms.
- **Corrections are append-only**: `PATCH /api/sales/:id` updates the sale but
  also writes an `AuditLog` row with the old/new values and the admin's
  reason — nothing is silently overwritten.
- **Role boundaries** are enforced in `src/middleware.ts` (not just hidden in
  the UI) — employees get 401/403 from admin-only APIs even if they guess the URL.
- **Offline**: `public/sw.js` caches the app shell for fast loads and an
  offline fallback page. Sale submission is deliberately network-only for V1
  (queued offline sales are a listed future enhancement, not implemented —
  see section 22/26 of the product spec) so a sale is never silently lost or
  double-counted.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run db:migrate` — create a new Prisma migration
- `npm run db:seed` — re-run the seed (upserts, safe to re-run)
- `npm run db:studio` — Prisma Studio to browse the database
- `npm run cron:reports` — trigger the report cron once (see above)
