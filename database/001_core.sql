-- STOKLY schema v1. Run ONLY on a Neon development branch before production approval.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS user_roles (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','marketing')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(60) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  category varchar(90) NOT NULL DEFAULT 'Umum',
  price numeric(16,2) NOT NULL CHECK (price >= 0),
  min_stock integer NOT NULL DEFAULT 5 CHECK(min_stock>=0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_balances (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 0 CHECK(quantity>=0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL REFERENCES "user"(id),
  note varchar(400) NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text GENERATED ALWAYS AS ('SL-'||upper(substr(replace(id::text,'-',''),1,10))) STORED UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL REFERENCES "user"(id),
  idempotency_key varchar(120) NOT NULL,
  total numeric(16,2) NOT NULL CHECK(total>=0),
  status text NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','cancelled')),
  UNIQUE(created_by,idempotency_key)
);
CREATE TABLE IF NOT EXISTS sale_items (
  sale_id uuid NOT NULL REFERENCES sales(id),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK(quantity>0),
  unit_price numeric(16,2) NOT NULL CHECK(unit_price>=0),
  PRIMARY KEY(sale_id,product_id)
);
CREATE TABLE IF NOT EXISTS sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id),
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK(quantity>0),
  restock boolean NOT NULL,
  note varchar(400) NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity_delta integer NOT NULL CHECK(quantity_delta<>0),
  source_type text NOT NULL CHECK(source_type IN ('receipt','sale','return','adjustment')),
  source_id uuid NOT NULL,
  actor_id text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id,source_type,source_id)
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL REFERENCES "user"(id),
  action varchar(100) NOT NULL,
  entity varchar(80) NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_sale_product ON sale_returns(sale_id,product_id);
