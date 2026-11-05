-- STOKLY V4: owner daily closing report snapshots. Additive.
CREATE TABLE IF NOT EXISTS daily_closeouts(
 business_date date PRIMARY KEY,
 summary jsonb NOT NULL,
 note varchar(400) NOT NULL DEFAULT '',
 closed_by text NOT NULL,
 closed_at timestamptz NOT NULL DEFAULT now()
);
