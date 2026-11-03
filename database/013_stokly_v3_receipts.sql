-- STOKLY V3: additive receipt, override and consolidated payment data.
-- IMPORTANT: The historical receipt counter is deliberately NOT initialized here.
-- Before enabling new orders, verify the highest issued physical receipt
-- across all historical spreadsheets and any independently issued receipt books.
CREATE TABLE IF NOT EXISTS receipt_number_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 next_number integer CHECK(next_number BETWEEN 1 AND 10000000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO receipt_number_settings(singleton,next_number)
VALUES(true,NULL) ON CONFLICT(singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION allocate_stokly_receipt_number()
RETURNS varchar(7) LANGUAGE plpgsql AS $$
DECLARE allocated integer;
BEGIN
 UPDATE receipt_number_settings
 SET next_number=next_number+1, updated_at=now()
 WHERE singleton=true AND next_number BETWEEN 1 AND 9999999
 RETURNING next_number-1 INTO allocated;
 IF allocated IS NULL THEN
  RAISE EXCEPTION 'Nomor kwitansi belum dikonfigurasi atau sudah mencapai 9999999';
 END IF;
 RETURN lpad(allocated::text,7,'0');
END $$;

ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS document_number varchar(7);
CREATE UNIQUE INDEX IF NOT EXISTS customer_orders_document_number_uniq
 ON customer_orders(document_number) WHERE document_number IS NOT NULL;
ALTER TABLE customer_orders ALTER COLUMN document_number SET DEFAULT allocate_stokly_receipt_number();
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS physical_receipt_type varchar(40) NOT NULL DEFAULT '';
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS physical_receipt_status varchar(30) NOT NULL DEFAULT 'not_handed_over';
ALTER TABLE customer_orders ADD CONSTRAINT physical_receipt_status_allowed
 CHECK(physical_receipt_status IN ('not_handed_over','handed_over','returned_to_office'));

CREATE TABLE IF NOT EXISTS order_price_overrides (
 order_item_id uuid PRIMARY KEY REFERENCES customer_order_items(id),
 standard_price numeric(16,2) NOT NULL,
 applied_price numeric(16,2) NOT NULL,
 reason varchar(400) NOT NULL,
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 order_id uuid NOT NULL REFERENCES customer_orders(id),
 total_amount numeric(18,2) NOT NULL CHECK(total_amount>0),
 payment_method varchar(16) NOT NULL CHECK(payment_method IN ('cash','transfer','other')),
 payment_reference varchar(120) NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id),
 paid_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE delivery_payments ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES payment_batches(id);
CREATE INDEX IF NOT EXISTS idx_payment_batches_order ON payment_batches(order_id,paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_receipts_outlet_date ON customer_orders(outlet_id,ordered_on DESC);

-- Cutover instructions:
-- 1. Backfill existing customer_orders.document_number only after reconciling old receipts.
-- 2. Set next_number to the first unused seven-digit sequence, by audited operation.
--    UPDATE receipt_number_settings SET next_number = <verified_number>, updated_at=now()
--    WHERE singleton=true AND next_number IS NULL;
-- 3. DO NOT change delivery_notes.document_number; these are historic delivery identifiers.
-- 4. Old order numbers stay NULL until explicitly reconciled; never silently relabel them.
