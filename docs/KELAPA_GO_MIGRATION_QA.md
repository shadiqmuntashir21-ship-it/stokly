# STOKLY × KELAPA GO — Migration and release audit (November 2026)

Source: Google Sheets "Salinan dari KELAPA GO", ID 1pdYBRcG7lB7TD_BnCdnnuD8U4XAXp9iKBcEEIo5-SH4.
Two excluded sheets: NOTA KELUAR and Data Produksi. No code should import those.

## Final imported production source snapshot
- 22 accepted sheets / 6,259 preserved source rows, keyed by (sheet name, row number); 22 SHA-style ledger checkpoints (Postgres MD5 source checksums) maintained.
- 1,596 historical receipts with transaction details, 16 physical receipt numbers marked rusak.
- 1,386 KAS KECIL cash rows, 47 inventory item types, 18 basket source records.
- 107 outlet names in production after import & dedup by normalized case (contact details need manual matching).
- Verified first new receipt serial: 0001620, 1,596 existing and 16 void IDs reserved. No customer order or historical delivery was rewritten.
- Historical unpaid: 92 confirmed UNPAID items totaling Rp17,300,500 from original status; 14 other unsettled/unclear statuses flagged, not guessed.
- STOCK KM snapshot of 189 butir is **reference only**; not posted as inventory because category/product stock balances are unknown.
- Historical expense/cash data cannot be counted twice as new operating expenses. Invoices and JUALAN/pivot sheets are not separate sales records.
- Supplier/product selling prices must be verified in master screens; source prices by production grade were not reliable enough to set automatically.
- Original internal STOKLY modules remain; Rute & Ongkir entry and actions have been disabled without deleting historical data.

## Operational workflows
- Purchase & QC on one form, multi-grade A/B/C, grade-specific count & supplier price; unfinished QC retained for later.
- Production uses date and quantity, never asks admin to select a source batch; backend allocates accepted stock FIFO, computes raw material costs and adjusts finished inventory once.
- New orders save with document_number=NULL. Unique receipt numbers allocate atomically on successful dispatch, not at order creation; each delivery can have its own note. Register prevents reusing historical/void numbers.
- Owner and Admin can use cashbook and asset movement forms; Marketing retains existing responsibilities; Owner remains PIN-only.
- Unpaid legacy receipts dynamically reduce as recorded payment is applied; unknown PARTIAL/blank statuses remain reconciliation items.
- Owner dashboards expose cash/receipts/outlet snapshots without claiming historical cash or physical stock is audited.
- Never purge historical data until two external backups, forward balances and a restore drill exist.

## Before go-live
- CI TypeScript, full test suite and Next.js build all green on exact SHA.
- Neon staging transaction QA: 10 purchased, 8 passed QC, 2 rejected, 5 consumed, 4 finished, 1 damaged, raw cost Rp31,250. All test rows rolled back.
- Neon serial QA: 0001620 allocated; 0001621 marked void; next allocation correctly 0001622. Rollback preserves actual 0001620.
- Confirm production export, import tallies, Owner sessions, and no duplicate sales.
- Vercel production deploy exactly once after migrations, then check READY/aliases, HTTP protection for Owner and public entry.
