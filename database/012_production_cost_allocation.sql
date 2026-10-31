-- HPP of production outputs: explicit cost share for joint products.
CREATE TABLE IF NOT EXISTS production_cost_shares (
 production_id uuid NOT NULL,
 product_id uuid NOT NULL,
 share_pct numeric(7,4) NOT NULL CHECK(share_pct>0 AND share_pct<=100),
 updated_by text NOT NULL REFERENCES "user"(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(production_id,product_id),
 FOREIGN KEY(production_id,product_id) REFERENCES coconut_production_outputs(production_id,product_id)
);
CREATE INDEX IF NOT EXISTS idx_production_share_date ON production_cost_shares(updated_at DESC);
