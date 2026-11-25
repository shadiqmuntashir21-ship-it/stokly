-- Additive migration: no existing cash or historical transaction is changed.
CREATE TABLE IF NOT EXISTS cash_daily_budgets (
 budget_date date PRIMARY KEY,
 amount numeric(18,2) NOT NULL CHECK(amount>=0),
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cash_daily_budget_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 budget_date date NOT NULL,
 previous_amount numeric(18,2),
 next_amount numeric(18,2) NOT NULL CHECK(next_amount>=0),
 reason text NOT NULL CHECK(length(trim(reason))>=5),
 actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
