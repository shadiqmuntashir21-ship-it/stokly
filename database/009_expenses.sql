-- V2 finance groundwork: expenses must remain distinct from purchases and COGS.
CREATE TABLE IF NOT EXISTS expense_categories (
 code varchar(30) PRIMARY KEY,
 name varchar(90) NOT NULL,
 cost_class varchar(24) NOT NULL CHECK(cost_class IN ('production','delivery','operating'))
);
INSERT INTO expense_categories(code,name,cost_class) VALUES
 ('DIRECT_LABOR','Tenaga kerja produksi','production'),
 ('PRODUCTION_OVERHEAD','Overhead produksi','production'),
 ('DELIVERY_FUEL','BBM pengantaran','delivery'),
 ('DELIVERY_DRIVER','Upah pengantar','delivery'),
 ('DELIVERY_TOLL','Tol dan parkir','delivery'),
 ('VEHICLE_MAINTENANCE','Perawatan kendaraan','delivery'),
 ('ADMIN_PAYROLL','Gaji administrasi','operating'),
 ('MARKETING_COST','Biaya marketing','operating'),
 ('GENERAL_OPERATIONAL','Operasional umum','operating')
 ON CONFLICT(code) DO NOTHING;
CREATE TABLE IF NOT EXISTS expense_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key uuid NOT NULL UNIQUE,
 category_code varchar(30) NOT NULL REFERENCES expense_categories(code),
 amount numeric(18,2) NOT NULL CHECK(amount>0),
 incurred_on date NOT NULL,
 production_id uuid REFERENCES coconut_production(id),
 outlet_id uuid REFERENCES outlets(id),
 note varchar(400) NOT NULL,
 created_by text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense_entries(incurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_expense_category ON expense_entries(category_code,incurred_on DESC);
