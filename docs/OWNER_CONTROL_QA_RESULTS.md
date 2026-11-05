# STOKLY Owner Control — Staging QA, 5 November 2026

## Verified on development branch (no production deployment)
- Owner-specific UI routes, owner-only server actions, distinct Admin/Marketing navigation: TypeScript and Next.js build passed on GitHub Actions.
- Numbering of a legacy order with the existing `9000000` sequence and insert into reconciliation audit: passed on Neon staging. Savepoint rollback restored counter and removed test data.
- All 42 annual archive dataset queries: passed SQL EXPLAIN and limited SELECT execution on Neon staging.
- Business reporting SQL: Owner money, outlets and operational alerts returned valid rows on Neon staging.
- HPP scenario: 10 purchased coconuts at Rp5,000 each, 8 passed QC, 5 used, 5 products created; HPP raw-material allocation Rp6,250 per product, 100% production share. Rolled back.
- Staff access: Owner PIN remains in existing auth; Admin and Marketing continue free room entry.
- Financial invariant: receivables computed per invoice; one overpaid invoice must not offset another unpaid invoice.
- Annual ZIP writer tests: local header/central directory, CRC32, deflate compatibility; owner-only archive route and read-only snapshot verified by code tests.

## Pending before production release
- End-to-end click testing (web and mobile) using staging database, with signed-in Owner and staff rooms.
- Download a complete ZIP via authenticated route and verify SHA-256 in a browser. CLI tests do not replace this.
- Simulate concurrent order writes, invoice payments and Owner receipt number allocation against staging through real application.
- Test performance at 50 outlets and representative yearly transaction volume.
- Review HPP opening inventory cost and decide policy for COGS ledger; until then show HPP production estimates, not audited net profit.
- Year-end row deletion intentionally remains disabled. A full external PostgreSQL backup and cross-year opening-balance plan are prerequisites.
- After all tests: production backup, apply migrations 018 and 019, single final Vercel production deploy, post-release smoke tests.

No production migration, branch merge into live source, or Vercel deployment has been performed as part of this Owner-control revision.
