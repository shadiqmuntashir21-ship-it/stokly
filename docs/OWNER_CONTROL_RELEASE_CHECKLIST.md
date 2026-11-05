# STOKLY Owner Control — Release gates and deferred cleanup

## Production policy
- GitHub branch: `feat/stokly-owner-finance-archive`.
- Staging Neon branch: `br-flat-breeze-b4aeuglm` (reuse existing V4 copy; production Neon stays untouched).
- Run database migrations `018_owner_control_archive.sql` and `019_owner_reporting_indexes.sql` on staging; run CI; verify manual examples.
- **No production deployment, production migration, or main branch update until final QA and authorization.**
- Production rollout: backup first, stage additive migrations, single Vercel production deployment at end, verify and retain rollback plan.

## Feature scope
1. Owner-only Business Control Center, separated from free-access Admin/Marketing operations. The original Owner PIN and authentication remain untouched.
2. Owner finance center: delivered revenue, payments by payment date, all-time receivables, pending refunds, expense classes, HPP production average for **fully allocated** production batches.
3. Owner outlet comparison, QC/production/delivery alerts, audit screen and central business settings.
4. Existing legacy order receipt number reconciliation: link an audited physical seven-digit number (<9000000) or allocate a new 9xxxxxx number in a transaction. No automatic historical rewrites.
5. Owner-controlled annual ZIP archive: complete operational datasets grouped by originating transaction year (JSON + CSV), SHA-256 manifest, browser-local file verification.
6. Year-end deletion not enabled. It cannot safely be performed until unclosed/part-paid invoices, cross-year refunds, stock balances, open QC and production, immutable receipt numbers and cross-year foreign keys have a verified archival model.

## Reporting definitions
- Outlet net sales = value of issued invoices for delivered goods minus returns linked to that delivery; the report period uses delivery dates.
- Money received = payments logged during the selected date range.
- All-time receivables = per-issued-invoice `max(0, gross - return_credit - paid)`; never net an overpaid invoice against someone else's receivable. Overpayments form separate refund obligations.
- Expenses and route costs are distinct; do not subtract a cost twice.
- Current HPP per unit is an allocated, weighted average of valid production runs, **NOT COGS on stock shipped**. No official gross/net profit claims until cost layers and stock opening balances are reconciled.

## Archive guarantees and limits
- Master records and inventory balance in ZIP are current snapshots, **not 31 December historical balances**.
- Orders are selected by order year and include their related future deliveries/payments; procurement by receipt year; expenses by incurred year.
- Auth sessions, PINs, tokens, device credentials are excluded.
- Archive download records checksum and counts; Owner verifies ZIP locally, with two copies recommended.
- Export is capped at 100 MB uncompressed, 80 MB compressed and 150,000 records per dataset to protect function memory. For larger data, add staged asynchronous exports.
- CSV is Excel-readable and guards formula injection. JSON provides structured source data.
- ZIP archive does not replace a **full PostgreSQL backup**.

## Manual QA scenarios
- Owner session reaches /owner, staff reaches /dashboard without Owner-only financial records.
- Legacy order receipt cannot be assigned two numbers; duplicate physical numbers rejected; default 9xxxxxx generator not reset.
- 50 outlets and multiple orders: filtered metrics, payments on different days, partial returns, overpaid invoice plus another unpaid invoice.
- HPP run with 100% allocation, incomplete QC and missing cost shares; owner should not see fictional net profit.
- Yearly ZIP opens, manifest counts and digests are correct, CSV imports into Excel, browser-local ZIP SHA-256 verification is repeatable; year-end cleanup has no enabled delete control.
- Mobile navigation and PWA logo remain unchanged from V4; owner menus do not interfere with Admin/Marketing.
- Check indexes and slow queries after real usage; no force migration or destructive SQL.

## Yearly deletion — design prerequisite
Use stable archival storage outside Neon, a signed manifest and repeatable backup/restore procedure. Create immutable opening balances, separate obligations still open across years, and introduce transaction partitions or a safe relational purge graph. Run an isolated restore drill before enabling Owner-only deletion. **Do not implement "reset database" or delete completed years by date alone.**
