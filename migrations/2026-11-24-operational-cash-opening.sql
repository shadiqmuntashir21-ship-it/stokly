-- Independent opening balances; never import Excel balances automatically.
CREATE TABLE IF NOT EXISTS public.operational_cash_openings (
 wallet text PRIMARY KEY CHECK(wallet IN ('SMALL','LARGE')),
 amount numeric(16,2) NOT NULL CHECK(amount>=0),
 reason text NOT NULL CHECK(length(trim(reason))>=5),
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
