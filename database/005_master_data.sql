-- STOKLY V2 | 005: Core master data and audited edit operations (development first).
-- Existing product and stock records are preserved. No destructive changes.
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit varchar(24) NOT NULL DEFAULT 'PCS';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS suppliers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(160) NOT NULL,
 phone varchar(40) NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_active_name ON suppliers(active,name);

CREATE TABLE IF NOT EXISTS coconut_grades (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(40) NOT NULL UNIQUE,
 name varchar(100) NOT NULL,
 thickness_min_mm numeric(8,2),
 thickness_max_mm numeric(8,2),
 notes text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true,
 CHECK(thickness_min_mm IS NULL OR thickness_min_mm>=0),
 CHECK(thickness_max_mm IS NULL OR thickness_max_mm>=0),
 CHECK(thickness_min_mm IS NULL OR thickness_max_mm IS NULL OR thickness_min_mm<=thickness_max_mm)
);
CREATE TABLE IF NOT EXISTS supplier_prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 supplier_id uuid NOT NULL REFERENCES suppliers(id),
 grade_id uuid NOT NULL REFERENCES coconut_grades(id),
 unit varchar(24) NOT NULL DEFAULT 'BUTIR',
 unit_price numeric(16,2) NOT NULL CHECK(unit_price>=0),
 effective_at timestamptz NOT NULL DEFAULT now(),
 note text NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_price_lookup ON supplier_prices(supplier_id,grade_id,effective_at DESC);

CREATE TABLE IF NOT EXISTS outlet_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL UNIQUE,
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS outlets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(180) NOT NULL,
 phone varchar(40) NOT NULL DEFAULT '',
 pic_name varchar(120) NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',
 group_id uuid REFERENCES outlet_groups(id),
 latitude numeric(10,7),
 longitude numeric(10,7),
 notes text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
 CHECK(longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
 CHECK ((latitude IS NULL)=(longitude IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_outlets_active_name ON outlets(active,name);

CREATE TABLE IF NOT EXISTS product_price_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES products(id),
 outlet_id uuid REFERENCES outlets(id),
 price numeric(16,2) NOT NULL CHECK(price>=0),
 effective_at timestamptz NOT NULL DEFAULT now(),
 reason varchar(400) NOT NULL,
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_price_global ON product_price_history(product_id,effective_at DESC) WHERE outlet_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_price_outlet ON product_price_history(product_id,outlet_id,effective_at DESC) WHERE outlet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stock_adjustments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES products(id),
 before_qty integer NOT NULL CHECK(before_qty>=0),
 after_qty integer NOT NULL CHECK(after_qty>=0),
 reason varchar(400) NOT NULL CHECK(length(trim(reason))>=5),
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adjustment_date ON stock_adjustments(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_name ON products(active,name);
