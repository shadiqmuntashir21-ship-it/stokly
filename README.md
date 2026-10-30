# STOKLY

**Retail Management & Inventory System** — Next.js + PostgreSQL + PWA.

## Status
Foundation and operational MVP under construction on `feat/pwa-foundation`. **Not production ready.** No production deployment is authorized.

## Required
Node.js 22+, npm, an isolated Neon development branch, and a private `.env.local`.

1. `npm install`
2. `cp .env.example .env.local` and enter the **development** connection string and auth secret.
3. `npx auth@latest migrate` for Better Auth schema. Verify generated schema before applying it.
4. Apply `database/001_core.sql` against development database.
5. Run `STOKLY_BOOTSTRAP_ENABLED=1 OWNER_EMAIL=... OWNER_PASSWORD=... OWNER_NAME=... npm run bootstrap:owner` in development only, with `STOKLY_BOOTSTRAP_ENABLED=1` in the *same* environment; ensure Better Auth signup is enabled just for this process. Delete credentials from shell history and environment afterward.
6. `npm run dev` and complete manual UAT.

## PWA
Manifest and navigation-only network-first service worker. Private pages are never cached. Offline transactions are disabled. Installable icons must be present. Test install behavior in Chrome on Android and Safari on iOS. Service worker updates require review and testing.

## Security
Production self-signup disabled. Roles are assigned server-side in `user_roles`; accounts without a role are blocked. Do not put DB credentials in client code, Git, or public artifacts. Protect both preview and production deployments. Migration scripts require review and must never run against production without approval.

## Limitations
The development branch currently includes role-protected pages for products, goods receipts/issues, single-product sales, sale returns and read-only reporting. Financial refunds, refunds/net revenue, supplier integration, user invitations, and full stocktaking are NOT yet supported.n, single-item completed sales, receipts, read-only reporting, and owner/admin/marketing sessions. Return UI is deliberately disabled pending a safe item picker; outgoing goods, supplier management, payment states, advanced financial reporting, invitations, and KPI are not ready. Inventory screens are prototypes pending UAT. Never present this as a completed retail system.

## Environments
GitHub feature branch `feat/pwa-foundation`, Neon development branch `br-silent-pond-b43s305n`; main and Neon production are not modified.

## Development migrations

Apply `database/000_auth.sql`, `database/001_core.sql`, and `database/002_goods_issues.sql` in that order to a dedicated Neon development branch. They have been applied to the STOKLY development branch. Never apply to production without a reviewed migration plan.

PWA PNG icons are served at `/icons/icon-192.png` and `/icons/icon-512.png` from Next.js route handlers. Verify image generation and Chrome/Safari installability in CI and in-browser prior to release.

CI is compile/test only and does not deploy.

## Owner & staff onboarding
The first owner must visit `/setup` and enter a one-time high-entropy `STOKLY_SETUP_TOKEN` stored only in Vercel. Public sign-up remains disabled. Once the owner is created, `/setup` redirects to `/login`. Owner can create admin and marketing accounts at `/users`.
