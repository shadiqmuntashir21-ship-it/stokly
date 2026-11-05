-- STOKLY owner control and year archive metadata. Additive only.
CREATE TABLE IF NOT EXISTS receipt_number_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES customer_orders(id),
  document_number varchar(7) NOT NULL UNIQUE CHECK (document_number ~ '^[0-9]{7}$'),
  method varchar(20) NOT NULL CHECK (method IN ('physical_existing','new_sequence')),
  note varchar(400) NOT NULL CHECK (char_length(trim(note))>=8),
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipt_reconciliations_created ON receipt_number_reconciliations(created_at DESC);

CREATE TABLE IF NOT EXISTS annual_archive_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_year integer NOT NULL CHECK (archive_year BETWEEN 2020 AND 9999),
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  byte_size bigint NOT NULL CHECK (byte_size>0),
  record_counts jsonb NOT NULL,
  exported_by text NOT NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  verification_note varchar(400),
  UNIQUE (archive_year,sha256)
);
CREATE INDEX IF NOT EXISTS idx_annual_archives_year ON annual_archive_exports(archive_year,exported_at DESC);
-- No DROP/DELETE of operational rows. Yearly cleanup requires a separate ledger-safe retention migration.
