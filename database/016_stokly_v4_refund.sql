-- STOKLY V4: credit/refund obligations on overpaid delivery returns.
CREATE TABLE IF NOT EXISTS delivery_refund_obligations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 delivery_id uuid NOT NULL REFERENCES delivery_notes(id),
 return_id uuid NOT NULL REFERENCES delivery_returns(id),
 amount numeric(18,2) NOT NULL CHECK(amount>0),
 status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN('pending','paid')),
 payment_method varchar(16),
 payment_reference varchar(120),
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz,
 paid_by text,
 UNIQUE(return_id)
);
CREATE INDEX IF NOT EXISTS idx_refund_obligations_delivery ON delivery_refund_obligations(delivery_id,status);
