-- V2 return credits and complaints; never change V1 returns.
CREATE TABLE IF NOT EXISTS delivery_returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 delivery_id uuid NOT NULL REFERENCES delivery_notes(id),
 order_item_id uuid NOT NULL REFERENCES customer_order_items(id),
 quantity integer NOT NULL CHECK(quantity>0),
 credit_amount numeric(18,2) NOT NULL CHECK(credit_amount>=0),
 restock boolean NOT NULL DEFAULT false,
 reason varchar(400) NOT NULL CHECK(length(trim(reason))>=5),
 qc_result varchar(30) NOT NULL DEFAULT 'pending' CHECK(qc_result IN ('pending','passed','rejected','not_applicable')),
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_delivery ON delivery_returns(delivery_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_line ON delivery_returns(order_item_id);

CREATE TABLE IF NOT EXISTS outlet_complaints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 outlet_id uuid NOT NULL REFERENCES outlets(id),
 delivery_id uuid REFERENCES delivery_notes(id),
 product_id uuid REFERENCES products(id),
 description varchar(1000) NOT NULL CHECK(length(trim(description))>=5),
 category varchar(30) NOT NULL CHECK(category IN ('quality','quantity','delivery','price','other')),
 status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','rejected')),
 resolution varchar(1000) NOT NULL DEFAULT '',
 opened_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_complaints_outlet ON outlet_complaints(outlet_id,created_at DESC);
