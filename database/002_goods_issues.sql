-- Addition to STOKLY MVP: non-sale outgoing inventory.
-- Recorded as an explicit adjustment movement, linked to this issue document.
CREATE TABLE IF NOT EXISTS goods_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason varchar(400) NOT NULL CHECK (length(btrim(reason)) > 0),
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goods_issues_date ON goods_issues(created_at DESC);
