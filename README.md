# STOKLY

Retail Management PWA — Next.js, Better Auth, Vercel, and Neon PostgreSQL.

## Login and access

The active development branch uses **username + individual 8-digit PIN** for Owner, Admin and Marketing. Better Auth's username plugin verifies PIN hashes; the app does not store raw PINs. Public signup/email login are disabled. Login attempts have database-backed rate limiting (five requests per ten-minute window per IP).

First Owner: visit `/setup` and supply the server-side `STOKLY_SETUP_TOKEN` along with name, username and PIN. This setup may be completed only once. The Owner creates Admin and Marketing accounts from `/users`. Never send PINs or setup tokens in chat or commit them to Git. Email is still used internally as a unique placeholder in Better Auth, not as a sign-in field.

## Environments

- GitHub development: `feat/pwa-foundation`.
- Neon development: `br-silent-pond-b43s305n`.
- Existing production Vercel deployment is on an earlier commit and still uses email/password. **Changes in development are not live until specifically deployed.**

## Database migration order

Apply `database/000_auth.sql`, `database/001_core.sql`, `database/002_goods_issues.sql`, then `database/003_username_pin.sql` in order. The username/PIN migration was applied only to Neon Development. Before a future production release, review the schema, create a backup/recovery plan, and apply the new migration to Production.

## Verification

Run `npm install`, `npm run check`, `npm run build`. Test Owner setup, username sign-in, permissions, rate limiting, PWA installability, and live inventory transaction flows with development data. Do not use the old email bootstrap script.

## Operating limits

This is an early MVP: single-product sales, goods receipts/issues, stock ledger, basic sales returns, reports and role-protected dashboard. Payment/refund processing, user PIN reset, stocktaking, multi-location, supplier management and other advanced features are not complete. Avoid live business transactions until UAT.

Production deployment is NOT part of this development-only login change.
