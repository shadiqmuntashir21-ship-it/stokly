-- STOKLY V2 orders -> dispatch -> invoice -> payments.
-- New tables only: historic V1 sales are left unchanged.
CREATE TABLE IF NOT EXISTS customer_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 outlet_id uuid NOT NULL REFERENCES outlets(id),
 ordered_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
 desired_delivery date,
 status varchar(20) NOT NULL DEFAULT 'confirmed'
   CHECK(status IN ('confirmed','partially_delivered','delivered','cancelled')),
 note varchar(400) NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_outlet ON customer_orders(outlet_id,created_at DESC);
CREATE TABLE IF NOT EXISTS customer_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES customer_orders(id),
 product_id uuid NOT NULL REFERENCES products(id),
 quantity integer NOT NULL CHECK(quantity>0),
 unit_price numeric(16,2) NOT NULL CHECK(unit_price>=0),
 UNIQUE(order_id,product_id)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON customer_order_items(order_id);
CREATE SEQUENCE IF NOT EXISTS stokly_invoice_number_seq START 1;
CREATE TABLE IF NOT EXISTS delivery_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 order_id uuid NOT NULL REFERENCES customer_orders(id),
 document_number varchar(32) NOT NULL UNIQUE DEFAULT ('NT-' || lpad(nextval('stokly_invoice_number_seq')::text,7,'0')),
 delivered_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
 note varchar(400) NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_order ON delivery_notes(order_id,created_at DESC);
CREATE TABLE IF NOT EXISTS delivery_note_items (
 delivery_id uuid NOT NULL REFERENCES delivery_notes(id),
 order_item_id uuid NOT NULL REFERENCES customer_order_items(id),
 quantity integer NOT NULL CHECK(quantity>0),
 unit_price numeric(16,2) NOT NULL CHECK(unit_price>=0),
 PRIMARY KEY(delivery_id,order_item_id)
);
CREATE INDEX IF NOT EXISTS idx_delivery_item_order ON delivery_note_items(order_item_id);
CREATE TABLE IF NOT EXISTS delivery_invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 delivery_id uuid NOT NULL UNIQUE REFERENCES delivery_notes(id),
 gross numeric(18,2) NOT NULL CHECK(gross>=0),
 issued_at timestamptz NOT NULL DEFAULT now(),
 status varchar(15) NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','void'))
);
CREATE TABLE IF NOT EXISTS delivery_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 invoice_id uuid NOT NULL REFERENCES delivery_invoices(id),
 amount numeric(18,2) NOT NULL CHECK(amount>0),
 payment_method varchar(16) NOT NULL CHECK(payment_method IN ('cash','transfer','other')),
 payment_reference varchar(120) NOT NULL DEFAULT '',
 paid_at timestamptz NOT NULL DEFAULT now(),
 created_by text NOT NULL REFERENCES "user"(id)
);
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON delivery_payments(invoice_id);
