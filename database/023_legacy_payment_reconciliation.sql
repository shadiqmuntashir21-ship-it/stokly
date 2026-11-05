CREATE TABLE IF NOT EXISTS legacy_receipt_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key uuid NOT NULL UNIQUE,
 document_number varchar(20) NOT NULL REFERENCES legacy_receipts(document_number),
 paid_on date NOT NULL, amount numeric(16,2) NOT NULL CHECK(amount>0),
 payment_method text NOT NULL, note text NOT NULL DEFAULT '', created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_legacy_receipt_payments_number ON legacy_receipt_payments(document_number);
CREATE OR REPLACE VIEW v_go_unpaid_current AS
 WITH p AS (SELECT document_number,COALESCE(SUM(amount),0)::numeric AS new_payments FROM legacy_receipt_payments GROUP BY document_number),
 s AS (SELECT r.document_number,r.issued_on,r.outlet_name,r.quantity,r.gross,r.return_value,r.final_amount,r.status,
 coalesce(p.new_payments,0) AS new_payments,
 upper(coalesce(r.original->>7,'')) AS original_status
 FROM legacy_receipts r LEFT JOIN p ON p.document_number=r.document_number)
 SELECT s.*,
 CASE WHEN original_status='PAID' THEN 0::numeric
 WHEN original_status='UNPAID' THEN GREATEST(0,final_amount-new_payments)
 ELSE NULL::numeric END AS confirmed_due,
 original_status NOT IN('PAID','UNPAID') AS needs_reconciliation
 FROM s WHERE original_status NOT IN('PAID') AND (original_status<>'UNPAID' OR final_amount>new_payments);
CREATE OR REPLACE VIEW v_go_outlet_summary_current AS
 WITH p AS(SELECT document_number,COALESCE(SUM(amount),0) AS new_payments FROM legacy_receipt_payments GROUP BY document_number)
 SELECT r.outlet_name,COUNT(*)::int AS receipt_count,
 COALESCE(SUM(r.quantity),0)::int AS total_pcs,
 COALESCE(SUM(r.gross-r.return_value),0)::numeric(16,2) AS net_sales,
 COALESCE(SUM(CASE WHEN upper(coalesce(r.original->>7,''))='UNPAID' THEN GREATEST(0,r.final_amount-COALESCE(p.new_payments,0)) ELSE 0 END),0)::numeric(16,2) AS confirmed_unpaid,
 COUNT(*) FILTER(WHERE upper(coalesce(r.original->>7,'')) NOT IN('PAID','UNPAID'))::int AS needs_reconciliation
 FROM legacy_receipts r LEFT JOIN p ON p.document_number=r.document_number GROUP BY r.outlet_name;
