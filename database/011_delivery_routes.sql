-- V2 manual route expenses and traceable delivery cost allocations.
CREATE TABLE IF NOT EXISTS delivery_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 title varchar(140) NOT NULL,
 route_date date NOT NULL,
 vehicle varchar(100) NOT NULL DEFAULT '',
 driver varchar(120) NOT NULL DEFAULT '',
 distance_km numeric(12,2) CHECK(distance_km IS NULL OR distance_km>=0),
 note varchar(400) NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_route_date ON delivery_routes(route_date DESC);
CREATE TABLE IF NOT EXISTS delivery_route_stops (
 route_id uuid NOT NULL REFERENCES delivery_routes(id),
 delivery_id uuid NOT NULL UNIQUE REFERENCES delivery_notes(id),
 stop_order integer NOT NULL CHECK(stop_order>0),
 PRIMARY KEY(route_id,delivery_id),
 UNIQUE(route_id,stop_order)
);
CREATE TABLE IF NOT EXISTS delivery_route_costs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 route_id uuid NOT NULL REFERENCES delivery_routes(id),
 category varchar(28) NOT NULL CHECK(category IN ('fuel','driver','toll','parking','vehicle','other')),
 amount numeric(18,2) NOT NULL CHECK(amount>0),
 note varchar(400) NOT NULL DEFAULT '',
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_route_costs ON delivery_route_costs(route_id);
