-- Additive audit ledger, no rewrites of historical invoice amounts.
CREATE TABLE IF NOT EXISTS public.legacy_receipt_balance_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 document_number varchar NOT NULL REFERENCES public.legacy_receipts(document_number),
 review_date date NOT NULL,
 new_due numeric(16,2) NOT NULL CHECK (new_due>=0),
 payments_at_review numeric(16,2) NOT NULL DEFAULT 0 CHECK (payments_at_review>=0),
 reason text NOT NULL CHECK (length(trim(reason))>=10),
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_receipt_balance_reviews_document ON public.legacy_receipt_balance_reviews(document_number,created_at DESC);
CREATE OR REPLACE VIEW public.v_go_unpaid_current AS
WITH p AS (
 SELECT document_number,COALESCE(SUM(amount),0) AS new_payments
 FROM public.legacy_receipt_payments GROUP BY document_number
), rlatest AS (
 SELECT DISTINCT ON (document_number) document_number,new_due,payments_at_review
 FROM public.legacy_receipt_balance_reviews ORDER BY document_number,created_at DESC,id DESC
), s AS (
 SELECT r.document_number,r.issued_on,r.outlet_name,r.quantity,r.gross,r.return_value,r.final_amount,
 r.status,COALESCE(p.new_payments,0) AS new_payments,
 UPPER(COALESCE(r.original->>7,'')) AS original_status,
 rlatest.new_due,rlatest.payments_at_review,rlatest.document_number AS reviewed_number
 FROM public.legacy_receipts r
 LEFT JOIN p ON p.document_number=r.document_number
 LEFT JOIN rlatest ON rlatest.document_number=r.document_number
), reviewed AS (
 SELECT s.*,
 CASE
  WHEN reviewed_number IS NOT NULL THEN GREATEST(0,new_due-GREATEST(0,new_payments-payments_at_review))
  WHEN original_status='PAID' THEN 0::numeric
  WHEN original_status='UNPAID' THEN GREATEST(0,final_amount-new_payments)
  ELSE NULL::numeric
 END AS due_now
 FROM s
)
SELECT document_number,issued_on,outlet_name,quantity,gross,return_value,final_amount,status,
 new_payments,original_status,due_now AS confirmed_due,
 (reviewed_number IS NULL AND original_status <> ALL (ARRAY['PAID','UNPAID'])) AS needs_reconciliation
FROM reviewed
WHERE (due_now>0 OR due_now IS NULL) AND (reviewed_number IS NOT NULL OR original_status<>'PAID');
