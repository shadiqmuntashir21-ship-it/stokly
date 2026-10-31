-- STOKLY V2: coconut procurement, QC and production, with delivery groundwork.
-- All amounts IDR, raw coconut quantities whole BUTIR. Never changes existing production data.
CREATE TABLE IF NOT EXISTS coconut_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 supplier_id uuid NOT NULL REFERENCES suppliers(id),
 grade_id uuid NOT NULL REFERENCES coconut_grades(id),
 quantity integer NOT NULL CHECK(quantity>0),
 price_per_butir numeric(16,2) NOT NULL CHECK(price_per_butir>=0),
 total_value numeric(18,2) GENERATED ALWAYS AS (quantity * price_per_butir) STORED,
 received_at timestamptz NOT NULL DEFAULT now(),
 note varchar(400) NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id)
);
CREATE INDEX IF NOT EXISTS idx_coconut_receipts_date ON coconut_receipts(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_coconut_receipts_supplier ON coconut_receipts(supplier_id,received_at DESC);

CREATE TABLE IF NOT EXISTS coconut_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 receipt_id uuid NOT NULL UNIQUE REFERENCES coconut_receipts(id),
 received_qty integer NOT NULL CHECK(received_qty>0),
 accepted_qty integer NOT NULL DEFAULT 0 CHECK(accepted_qty>=0),
 rejected_qty integer NOT NULL DEFAULT 0 CHECK(rejected_qty>=0),
 consumed_qty integer NOT NULL DEFAULT 0 CHECK(consumed_qty>=0),
 CHECK(accepted_qty+rejected_qty<=received_qty),
 CHECK(consumed_qty<=accepted_qty)
);

CREATE TABLE IF NOT EXISTS coconut_qc (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 batch_id uuid NOT NULL REFERENCES coconut_batches(id),
 inspected_qty integer NOT NULL CHECK(inspected_qty>0),
 passed_qty integer NOT NULL CHECK(passed_qty>=0),
 rejected_qty integer NOT NULL CHECK(rejected_qty>=0),
 reject_reason varchar(400) NOT NULL DEFAULT '',
 inspected_by text NOT NULL REFERENCES "user"(id),
 inspected_at timestamptz NOT NULL DEFAULT now(),
 CHECK(passed_qty+rejected_qty=inspected_qty),
 CHECK(rejected_qty=0 OR length(trim(reject_reason))>=5)
);
CREATE INDEX IF NOT EXISTS idx_coconut_qc_batch ON coconut_qc(batch_id,inspected_at DESC);

CREATE TABLE IF NOT EXISTS coconut_production (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 batch_id uuid NOT NULL REFERENCES coconut_batches(id),
 coconut_used integer NOT NULL CHECK(coconut_used>0),
 peeled_qty integer NOT NULL CHECK(peeled_qty>=0 AND peeled_qty<=coconut_used),
 production_date date NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date,
 note varchar(400) NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coconut_production_outputs (
 production_id uuid NOT NULL REFERENCES coconut_production(id),
 product_id uuid NOT NULL REFERENCES products(id),
 produced_qty integer NOT NULL CHECK(produced_qty>0),
 PRIMARY KEY(production_id,product_id)
);
CREATE INDEX IF NOT EXISTS idx_coconut_production_date ON coconut_production(production_date DESC);

CREATE TABLE IF NOT EXISTS marketing_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 outlet_id uuid NOT NULL REFERENCES outlets(id),
 visited_on date NOT NULL,
 staff_name varchar(120) NOT NULL,
 outcome varchar(30) NOT NULL CHECK(outcome IN ('prospek','order','follow_up','komplain','kunjungan')),
 note varchar(1000) NOT NULL DEFAULT '',
 follow_up_on date,
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visits_outlet_date ON marketing_visits(outlet_id,visited_on DESC);
CREATE INDEX IF NOT EXISTS idx_visits_date ON marketing_visits(visited_on DESC);
