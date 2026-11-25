-- Existing purchases remain unverified; never create a debt or debit for old records automatically.
ALTER TABLE kelapa_go_purchase_groups ADD COLUMN IF NOT EXISTS payment_tracking boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS cash_supplier_payment_group_idx ON cash_ledger_entries(reference_id) WHERE reference_type='supplier_purchase' AND voided_at IS NULL;
CREATE OR REPLACE VIEW v_go_purchase_payment_summary AS
 SELECT g.id AS group_id,g.received_date,g.supplier_id,s.name AS supplier_name,g.payment_tracking,
 COALESCE(t.total,0)::numeric(18,2) AS total,COALESCE(t.active_lines,0)::int AS active_lines,
 COALESCE(p.paid,0)::numeric(18,2) AS paid,
 CASE WHEN g.payment_tracking THEN GREATEST(0,COALESCE(t.total,0)-COALESCE(p.paid,0))::numeric(18,2) ELSE NULL END AS due
 FROM kelapa_go_purchase_groups g JOIN suppliers s ON s.id=g.supplier_id
 LEFT JOIN LATERAL (SELECT SUM(r.total_value) total,count(*) active_lines FROM kelapa_go_purchase_rows x JOIN coconut_receipts r ON r.id=x.receipt_id JOIN coconut_batches b ON b.receipt_id=r.id WHERE x.group_id=g.id AND b.voided_at IS NULL) t ON true
 LEFT JOIN LATERAL (SELECT SUM(e.amount) paid FROM cash_ledger_entries e WHERE e.reference_type='supplier_purchase' AND e.reference_id=g.id::text AND e.direction='OUT' AND e.voided_at IS NULL) p ON true;
