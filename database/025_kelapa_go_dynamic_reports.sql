-- Automatically calculated replacements for spreadsheet pivot/reports.
-- Historical receipts are source transactions; pivot rows are NOT duplicated.
CREATE OR REPLACE VIEW v_go_sales_daily AS
 SELECT issued_on,COUNT(*)::int AS receipt_count,
 COALESCE(SUM(quantity),0)::int AS pieces,
 COALESCE(SUM(gross),0)::numeric(16,2) AS gross,
 COALESCE(SUM(return_value),0)::numeric(16,2) AS return_value,
 COALESCE(SUM(gross-return_value),0)::numeric(16,2) AS net_sales
 FROM legacy_receipts WHERE issued_on IS NOT NULL GROUP BY issued_on;
CREATE OR REPLACE VIEW v_go_outlet_daily AS
 SELECT issued_on,outlet_name,COUNT(*)::int AS receipt_count,
 COALESCE(SUM(quantity),0)::int AS pieces,
 COALESCE(SUM(gross-return_value),0)::numeric(16,2) AS net_sales
 FROM legacy_receipts WHERE issued_on IS NOT NULL GROUP BY issued_on,outlet_name;
CREATE OR REPLACE VIEW v_go_cash_category_live AS
 WITH x AS (
 SELECT COALESCE(NULLIF(category,''),'BELUM DIKLASIFIKASI') AS category,
 money_in AS incoming,money_out AS outgoing FROM legacy_cash_entries
 UNION ALL
 SELECT category,
 CASE WHEN direction='IN' THEN amount ELSE 0 END,
 CASE WHEN direction='OUT' THEN amount ELSE 0 END FROM cash_ledger_entries
 )
 SELECT category,COUNT(*)::int AS entry_count,
 COALESCE(SUM(incoming),0)::numeric(16,2) AS total_in,
 COALESCE(SUM(outgoing),0)::numeric(16,2) AS total_out
 FROM x GROUP BY category;
CREATE OR REPLACE VIEW v_go_kasbon AS
 SELECT source_row,entry_date,description,money_out AS amount,category,'historical'::text AS origin
 FROM legacy_cash_entries
 WHERE upper(COALESCE(category,'')) LIKE '%KASBON%'
   OR upper(COALESCE(subcategory,'')) LIKE '%KASBON%'
 UNION ALL
 SELECT NULL::int,entry_date,description,amount,category,'new'::text
 FROM cash_ledger_entries WHERE upper(category) LIKE '%KASBON%';
