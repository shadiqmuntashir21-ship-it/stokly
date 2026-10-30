# STOKLY
Retail Management PWA · Next.js / Neon PostgreSQL / Vercel

## Current access: 3 rooms
- **Owner**: PIN required, server-side role checks, all modules. First account activated once at `/setup`, with secret `STOKLY_SETUP_TOKEN`.
- **Admin**: Opens directly from `/rooms` on a trusted device; no daily login.
- **Marketing**: Opens directly from `/rooms` on a trusted device; no daily login.
- **Device onboarding**: Owner uses PIN once on the staff device at `/login?activate=1`, then approves it at `/devices/activate`. No invite/QR/account needed.
- **Device revocation**: Owner uses `/devices`. New staff can use an already-approved device without changing credentials.
- **Change Owner PIN**: `/settings/security`.

Room access is enforced by trusted-device server tokens and by Owner authentication. Do not remove these server checks: a public URL alone must never grant write access.

## Database
Development branch: `br-silent-pond-b43s305n`.
Migrations in order: `000_auth.sql`, `001_core.sql`, `002_goods_issues.sql`, `003_username_pin.sql`, `004_trusted_rooms.sql`. Use database backups/restore plan before any production changes. Never commit PINs, setup tokens or connection credentials.

## Verification
`npm install`, `npm run check`, `npm run build`.
Perform browser UAT for Owner PIN, device provisioning, switching rooms, revoke lost device, stock transactions, sales and PWA installation.

## Limitations
This is an early MVP: public staff rooms operate through shared service identities on approved devices, so individual staff actions cannot be attributed to a person. Payments/refunds and multi-location are not complete. The web browser needs internet to record transactions.

See `docs/ROOM_BASED_ACCESS.md` for threat model and complete workflow.
