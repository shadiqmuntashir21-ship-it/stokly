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
 LEFT JOIN p ON p.document_numb¶»§q«^