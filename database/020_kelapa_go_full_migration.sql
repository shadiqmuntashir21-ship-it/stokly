
-- STOKLY Kelapa GO source migration and integrated operations (append-only migration).
CREATE TABLE IF NOT EXISTS legacy_source_rows (
 source_sheet text NOT NULL, source_row integer NOT NULL, data jsonb NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(source_sheet,source_row)
);
CREATE INDEX IF NOT EXISTS idx_legacy_source_sheet ON legacy_source_rows(source_sheet);
CREATE TABLE IF NOT EXISTS legacy_receipts (
 document_number varchar(20) PRIMARY KEY,
 source_row integer NOT NULL UNIQUE,
 issued_on date, outlet_name text, group_name text,
 quantity integer NOT NULL DEFAULT 0 CHECK(quantity>=0),
 gross numeric(16,2) NOT NULL DEFAULT 0, return_value numeric(16,2) NOT NULL DEFAULT 0,
 final_amount numeric(16,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'REVIEW',
 paid_on date, payment_method text, notes text, physical_type text, original jsonb NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_receipts_status ON legacy_receipts(status);
CREATE INDEX IF NOT EXISTS idx_legacy_receipts_outlet ON legacy_receipts(outlet_name);
CREATE INDEX IF NOT EXISTS idx_legacy_receipts_date ON legacy_receipts(issued_on);
CREATE TABLE IF NOT EXISTS legacy_void_receipts (
 document_number varchar(20) PRIMARY KEY, source_row integer NOT NULL UNIQUE,
 reason text NOT NULL DEFAULT 'Rusak menurut spreadsheet', original jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS legacy_cash_entries (
 source_row integer PRIMARY KEY, source_number text, entry_date date,
 description text NOT NULL, money_in numeric(16,2) NOT NULL DEFAULT 0,
 money_out numeric(16,2) NOT NULL DEFAULT 0,
 recorded_balance numeric(16,2), subcategory text, category text,
 notes text, original jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legacy_cash_date ON legacy_cash_entries(entry_date);
CREATE TABLE IF NOT EXISTS cash_ledger_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key uuid UNIQUE,
 entry_date date NOT NULL, direction text NOT NULL CHECK(direction IN('IN','OUT')),
 category text NOT NULL, description text NOT NULL, amount numeric(16,2) NOT NULL CHECK(amount>0),
 reference_type text, reference_id text, created_by text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_date ON cash_ledger_entries(entry_date);
CREATE TABLE IF NOT EXISTS inventory_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_row integer UNIQUE,
 name text NOT NULL, quantity integer NOT NULL DEFAULT 0 CHECK(quantity>=0),
 purchase_date date, vendor text, unit_price numeric(16,2), total_cost numeric(16,2),
 location text, condition text NOT NULL DEFAULT 'TERCATAT', note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_asset_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid NOT NULL REFERENCES inventory_assets(id),
 movement_date date NOT NULL, kind text NOT NULL CHECK(kind IN('IN','OUT','RETURN','LOST','DAMAGED','ADJUST')),
 quantity integer NOT NULL CHECK(quantity>0), outlet_id uuid REFERENCES outlets(id),
 note text, created_by text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS legacy_basket_movements (
 source_row integer PRIMARY KEY, basket_type text, movement_date date, outlet_name text, address text,
 quantity integer, reported_balance integer, note text, original jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS coconut_production_days (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key uuid NOT NULL UNIQUE,
 production_date date NOT NULL, coconut_used integer NOT NULL CHECK(coconut_used>0),
 damaged_qty integer NOT NULL DEFAULT 0 CHECK(damaged_qty>=0),
 note text NOT NULL DEFAULT '', raw_material_cost numeric(16,2) NOT NULL DEFAULT 0,
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coconut_production_day_outputs (
 production_id uuid NOT NULL REFERENCES coconut_production_days(id),
 product_id uuid NOT NULL REFERENCES products(id), quantity integer NOT NULL CHECK(quantity>0),
 unit_cost numeric(16,4), PRIMARY KEY(production_id,product_id)
);
CREATE TABLE IF NOT EXISTS coconut_production_day_consumptions (
 production_id uuid NOT NULL REFERENCES coconut_production_days(id),
 batch_id uuid NOT NULL REFERENCES coconut_batches(id),
 quantity integer NOT NULL CHECK(quantity>0),
 raw_cost numeric(16,2) NOT NULL DEFAULT 0,
 PRIMARY KEY(production_id,batch_id)
);
CREATE TABLE IF NOT EXISTS receipt_register (
 document_number varchar(24) PRIMARY KEY,
 status text NOT NULL CHECK(status IN('ISSUED','VOID','RESERVED')),
 order_id uuid UNIQUE REFERENCES customer_orders(id), delivery_id uuid UNIQUE REFERENCES delivery_notes(id),
 note text NOT NULL DEFAULT '', actor_id text, issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipt_register_status ON receipt_register(status);
CREATE TABLE IF NOT EXISTS migration_checkpoints (
 source_key text PRIMARY KEY, source_hash text, record_count integer NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(), note text
);
CREATE OR REPLACE VIEW v_kelapa_go_unpaid AS
 SELECT document_number,issued_on,outlet_name,quantity,gross,return_value,final_amount,status,
 CASE WHEN status='UNPAID' THEN final_amount
      WHEN status='PAID' THEN 0::numeric
      ELSE NULL::numeric END AS confirmed_due,
 CASE WHEN status IN('PARTIAL','REVIEW','') THEN true ELSE false END AS needs_reconciliation
 FROM legacy_receipts WHERE status IN('UNPAID','PARTIAL','REVIEW','');
CREATE OR REPLACE VIEW v_kelapa_go_outlet_summary AS
 SELECT outlet_name,count(*) FILTER (WHERE status<>'VOID')::int AS receipt_count,
 coalesce(sum(quantity),0)::int AS total_pcs,
 coalesce(sum(gross-return_value),0)::numeric(16,2) AS net_sales,
 coalesce(sum(CASE WHEN status='UNPAID' THEN final_amount ELSE 0 END),0)::numeric(16,2) AS confirmed_unpaid,
 count(*) FILTER(WHERE status IN('PARTIAL','REVIEW'))::int AS needs_reconciliation
 FROM legacy_receipts GROUP BY outlet_name;
CREATE OR REPLACE VIEW v_kelapa_go_cash_class_summary AS
 SELECT coalesce(nullif(category,''),'BELUM DIKLASIFIKASI') AS category,
 count(*)::int AS entry_count,
 coalesce(sum(money_in),0)::numeric(16,2) AS total_in,
 coalesce(sum(money_out),0)::numeric(16,2) AS total_out
 FROM legacy_cash_entries GROUP BY coalesce(nullif(category,''),'BELUM DIKLASIFIKASI');
