CREATE TABLE IF NOT EXISTS kelapa_go_purchase_groups(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key uuid NOT NULL UNIQUE,
 supplier_id uuid NOT NULL REFERENCES suppliers(id),
 received_date date NOT NULL, note text NOT NULL DEFAULT '',
 actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kelapa_go_purchase_rows (
 group_id uuid NOT NULL REFERENCES kelapa_go_purchase_groups(id),
 receipt_id uuid NOT NULL UNIQUE REFERENCES coconut_receipts(id),
 PRIMARY KEY(group_id,receipt_id)
);
