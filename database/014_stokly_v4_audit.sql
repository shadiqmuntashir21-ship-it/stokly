-- STOKLY V4, additive migration. Do not run on production until QA.
CREATE TABLE IF NOT EXISTS order_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES customer_orders(id),
 actor_id text NOT NULL,
 action varchar(30) NOT NULL CHECK(action IN ('edited','cancelled','restored')),
 reason text NOT NULL,
 previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
 next_state jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_audit_events_order ON order_audit_events(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON customer_orders(status,ordered_on DESC);
