-- Retain original rows; only active batches are available for QC and production.
ALTER TABLE coconut_batches ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE supplier_prices ADD COLUMN IF NOT EXISTS source_receipt_id uuid REFERENCES coconut_receipts(id);
ALTER TABLE supplier_prices ADD COLUMN IF NOT EXISTS voided_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS supplier_price_source_receipt_uq ON supplier_prices(source_receipt_id) WHERE source_receipt_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS transaction_correction_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 entity_type text NOT NULL,
 entity_id text NOT NULL,
 action text NOT NULL CHECK(action IN ('edit','void')),
 reason text NOT NULL CHECK(length(trim(reason))>=5),
 previous_state jsonb NOT NULL,
 next_state jsonb NOT NULL,
 actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transaction_correction_events_entity_idx ON transaction_correction_events(entity_type,entity_id,created_at DESC);
