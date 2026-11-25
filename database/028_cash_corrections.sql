-- Active balance excludes voided entries; originals remain for archive and audit.
ALTER TABLE cash_ledger_entries ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE inventory_assets ADD COLUMN IF NOT EXISTS voided_at timestamptz;
CREATE OR REPLACE VIEW v_go_cash_category_live AS
 WITH x AS (
 SELECT COALESCE(NULLIF(category,''),'BELUM DIKLASIFIKASI') AS category,money_in AS incoming,money_out AS outgoing FROM legacy_cash_entries
 UNION ALL
 SELECT category,CASE WHEN direction='IN' THEN amount ELSE 0::numeric END,CASE WHEN direction='OUT' THEN amount ELSE 0::numeric END FROM cash_ledger_entries WHERE voided_at IS NULL
 ) SELECT category,count(*)::integer AS entry_count,COALESCE(sum(incoming),0)::numeric(16,2) AS total_in,COALESCE(sum(outgoing),0)::numeric(16,2) AS total_out FROM x GROUP BY category;
CREATE OR REPLACE VIEW v_go_kasbon AS
 SELECT source_row,entry_date,description,money_out AS amount,category,'historical'::text AS origin FROM legacy_cash_entries
 WHERE upper(COALESCE(category,'')) LIKE '%KASBON%' OR upper(COALESCE(subcategory,'')) LIKE '%KASBON%'
 UNION ALL
 SELECT NULL::integer,entry_date,description,amount,category,'new'::text FROM cash_ledger_entries WHERE voided_at IS NULL AND upper(category) LIKE '%KASBON%';
