# STOKLY V3 — staged implementation

## Scope implemented on this branch
- PostgreSQL-generated seven-digit order-level receipt number.
- Owner/Admin price overrides with mandatory explanation and historical master-price snapshot.
- Multi-line dispatch per order with atomic stock movement and invoice creation.
- Consolidated order view: gross shipped, returns, payments and remaining balance.
- One payment action allocates across outstanding delivery invoices and records an idempotent payment batch.
- Physical receipt classification and handover status.

## Critical rollout gates
1. Migration database/013_stokly_v3_receipts.sql is ADDITIVE and runs on isolated Neon review branch first.
2. Allocator has NULL next_number by default. New orders are intentionally blocked until historical numbering is reconciled.
3. Verify number against the complete spreadsheet and physical receipt books; do not use filtered screenshots.
4. Existing customer orders remain unnumbered pending reconciliation, and legacy delivery identifiers are preserved.
5. Backfill prior order document numbers with audited mapping, then enable next_number above all issued numbers.
6. Preview must use development database, never production.
7. No production deploy, main merge, or production DB migration without QA and final approval.

## QA scenarios
- Concurrent orders produce unique seven-digit receipt numbers.
- Repeated submission with the same request_key is idempotent.
- Marketing cannot modify price; Admin/Owner must enter explanation.
- Multi-line dispatch commits all items, stock movements and invoices together or none.
- Partial shipments, returns and payments calculate correctly.
- Payment retry does not create duplicate allocations.
- Returned goods can re-enter saleable stock only after passed QC.
- Historic V1/V2 sale and delivery identifiers stay unchanged.

## Still pending
- Historical mapping and activation of production receipt-number counter.
- PDF printing, CSV export, robust cancellations/refunds, grade editing and QC batch guidance.
- TypeScript/build and full runtime QA before release.
