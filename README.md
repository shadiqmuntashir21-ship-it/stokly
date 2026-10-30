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
The current foundation supports product creation, single-item completed sales, receipts, read-only reporting, and owner/admin/marketing sessions. Return UI is deliberately disabled pending a safe item picker; outgoing goods, supplier management, payment states, advanced financial reporting, invitations, and KPI are not ready. Inventory screens are prototypes pending UAT. Never present this as a completed retail system.

## Environments
GitHub feature branch `feat/pwa-foundation`, Neon development branch `br-silent-pond-b43s305n`; main and Neon production are not modified.
