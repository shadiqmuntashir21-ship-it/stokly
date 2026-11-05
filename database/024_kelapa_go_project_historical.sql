-- Convert imported spreadsheet sources to operational master and historical ledgers.
-- Idempotent, non-destructive; pivots and Sheet23 are reference-only, not duplicate transactions.
INSERT INTO legacy_receipts(document_number,source_row,issued_on,outlet_name,group_name,quantity,gross,return_value,final_amount,status,paid_on,payment_method,notes,physical_type,original)
SELECT data->>0,source_row,CASE WHEN data->>1 ~ '^[0-9]{5}$' THEN DATE '1899-12-30'+(data->>1)::int END,
trim(data->>2),nullif(trim(data->>3),''),
CASE WHEN data->>4 ~ '^[0-9]+$' THEN (data->>4)::int ELSE 0 END,
CASE WHEN data->>5 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>5)::numeric ELSE 0 END,
CASE WHEN data->>6 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>6)::numeric ELSE 0 END,
CASE WHEN data->>12 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>12)::numeric ELSE
  (CASE WHEN data->>5 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>5)::numeric ELSE 0 END)
 -(CASE WHEN data->>6 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>6)::numeric ELSE 0 END) END,
CASE WHEN upper(trim(coalesce(data->>7,''))) IN ('PAID','UNPAID','PARTIAL') THEN upper(trim(data->>7)) ELSE 'REVIEW' END,
CASE WHEN data->>8 ~ '^[0-9]{5}$' THEN DATE '1899-12-30'+(data->>8)::int END,
nullif(trim(data->>11),''),nullif(trim(data->>14),''),nullif(trim(data->>15),''),data
FROM legacy_source_rows
WHERE source_sheet='KWITANSI' AND source_row>1 AND data->>0 ~ '^[0-9]{7}$'
AND length(trim(coalesce(data->>2,'')))>1 AND upper(trim(data->>2))<>'RUSAK'
AND coalesce(trim(data->>1),'')<>'' ON CONFLICT(document_number) DO NOTHING;

INSERT INTO legacy_void_receipts(document_number,source_row,reason,original)
SELECT data->>0,source_row,'Rusak dari sheet KWITANSI',data FROM legacy_source_rows
WHERE source_sheet='KWITANSI' AND data->>0 ~ '^[0-9]{7}$' AND upper(trim(data->>2))='RUSAK'
ON CONFLICT(document_number) DO NOTHING;

INSERT INTO legacy_cash_entries(source_row,source_number,entry_date,description,money_in,money_out,recorded_balance,subcategory,category,notes,original)
SELECT source_row,data->>0,
CASE WHEN data->>1 ~ '^[0-9]{5}$' THEN DATE '1899-12-30'+(data->>1)::int END,trim(data->>2),
CASE WHEN data->>3 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>3)::numeric ELSE 0 END,
CASE WHEN data->>4 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>4)::numeric ELSE 0 END,
CASE WHEN data->>5 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>5)::numeric ELSE NULL END,
nullif(trim(data->>6),''),nullif(trim(data->>7),''),nullif(trim(data->>8),''),data
FROM legacy_source_rows WHERE source_sheet='KAS KECIL' AND source_row>1
AND length(trim(coalesce(data->>2,'')))>1 AND
(data->>3 ~ '^-?[0-9]+([.][0-9]+)?$' OR data->>4 ~ '^-?[0-9]+([.][0-9]+)?$')
ON CONFLICT(source_row) DO NOTHING;

INSERT INTO inventory_assets(source_row,name,quantity,purchase_date,vendor,unit_price,total_cost,note)
SELECT source_row,trim(data->>1),
CASE WHEN data->>2 ~ '^[0-9]+$' THEN (data->>2)::int ELSE 0 END,
CASE WHEN data->>3 ~ '^[0-9]{5}$' THEN DATE '1899-12-30'+(data->>3)::int END,
nullif(trim(data->>4),''),
CASE WHEN data->>5 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>5)::numeric END,
CASE WHEN data->>6 ~ '^-?[0-9]+([.][0-9]+)?$' THEN (data->>6)::numeric END,
nullif(trim(data->>7),'')
FROM legacy_source_rows WHERE source_sheet='INVENTARIS' AND source_row>1
AND length(trim(coalesce(data->>1,'')))>1 ON CONFLICT(source_row) DO NOTHING;

INSERT INTO legacy_basket_movements(source_row,basket_type,movement_date,outlet_name,address,quantity,reported_balance,note,original)
SELECT source_row,nullif(trim(data->>1),''),
CASE WHEN data->>2 ~ '^[0-9]{5}$' THEN DATE '1899-12-30'+(data->>2)::int END,
nullif(trim(data->>3),''),nullif(trim(data->>4),''),
CASE WHEN data->>5 ~ '^[-]?[0-9]+$' THEN (data->>5)::int END,
CASE WHEN data->>6 ~ '^[-]?[0-9]+$' THEN (data->>6)::int END,
nullif(trim(data->>7),''),data
FROM legacy_source_rows WHERE source_sheet='KERANJANG' AND source_row>1
AND length(trim(coalesce(data->>1,'')))>1 ON CONFLICT(source_row) DO NOTHING;

WITH e AS (
 SELECT trim(data->>1) name,trim(coalesce(data->>2,'')) address,
 trim(coalesce(data->>3,'')) pic,trim(coalesce(data->>4,'')) phone,source_row
 FROM legacy_source_rows WHERE source_sheet='STORE/OUTLET' AND source_row>1
 AND length(trim(coalesce(data->>1,'')))>1
), u AS (SELECT DISTINCT ON(lower(name)) * FROM e ORDER BY lower(name),source_row)
INSERT INTO outlets(name,phone,pic_name,address,notes)
SELECT name,phone,pic,address,'Impor STORE/OUTLET baris '||source_row FROM u
WHERE NOT EXISTS(SELECT 1 FROM outlets o WHERE lower(trim(o.name))=lower(u.name));

WITH e AS(
 SELECT trim(data->>1) name FROM legacy_source_rows WHERE source_sheet='DAFTAR OUTLET'
 AND source_row>2 AND length(trim(coalesce(data->>1,'')))>1 AND upper(trim(data->>1))<>'GRAND TOTAL'
 UNION SELECT trim(data->>1) FROM legacy_source_rows WHERE source_sheet='STOK OUTLET' AND source_row>1 AND length(trim(coalesce(data->>1,'')))>1
 UNION SELECT trim(outlet_name) FROM legacy_receipts WHERE length(trim(coalesce(outlet_name,'')))>1
),u AS(SELECT DISTINCT ON(lower(name)) name FROM e WHERE name NOT ILIKE '%TOTAL%' ORDER BY lower(name),name)
INSERT INTO outlets(name,notes) SELECT name,'Impor historis KELAPA GO; lengkapi kontak bila perlu'
FROM u WHERE NOT EXISTS(SELECT 1 FROM outlets o WHERE lower(trim(o.name))=lower(u.name));

WITH e AS(
 SELECT trim(data->>1) name,trim(coalesce(data->>2,'')) address,trim(coalesce(data->>3,'')) phone
 FROM legacy_source_rows WHERE source_sheet='SUPPLIER' AND source_row>1 AND length(trim(coalesce(data->>1,'')))>1
),u AS(SELECT DISTINCT ON(lower(name)) * FROM e ORDER BY lower(name))
INSERT INTO suppliers(name,phone,address,notes)
SELECT name,phone,address,'Master KELAPA GO; rekening rahasia disimpan dalam sumber Owner'
FROM u WHERE NOT EXISTS(SELECT 1 FROM suppliers s WHERE lower(trim(s.name))=lower(u.name));

INSERT INTO coconut_grades(code,name,notes) VALUES
('GRADE-A','Grade A','Grade bahan baku pembelian'),
('GRADE-B','Grade B','Grade bahan baku pembelian'),
('GRADE-C','Grade C','Grade bahan baku pembelian') ON CONFLICT(code) DO NOTHING;

INSERT INTO products(sku,name,category,price,min_stock,unit,description) VALUES
('GO-MAKAN-FULL','Grade A - Makan Full','Kelapa Jadi',0,5,'BUTIR','Produk hasil produksi'),
('GO-KELAPA-TAR','Grade B - Kelapa Tar','Kelapa Jadi',0,5,'BUTIR','Produk hasil produksi'),
('GO-SERUT','Serut GO','Kelapa Jadi',0,5,'PCS','Produk hasil serut'),
('GO-RUSAK','Kelapa Rusak Produksi','Afkir',0,0,'BUTIR','Tidak dapat dijual, dihitung sebagai kerusakan')
ON CONFLICT(sku) DO NOTHING;

CREATE TABLE IF NOT EXISTS legacy_stock_snapshots(
 source_sheet text PRIMARY KEY, source_row integer NOT NULL,snapshot_date date,
 quantity integer NOT NULL,status text NOT NULL DEFAULT 'PENDING_RECONCILIATION',note text NOT NULL
);
INSERT INTO legacy_stock_snapshots(source_sheet,source_row,snapshot_date,quantity,note)
SELECT source_sheet,source_row,
CASE WHEN data->>1 ~ '^[0-9]{5}$' THEN DATE '1899-12-30'+(data->>1)::int END,
(data->>5)::int,'Saldo historis STOCK KM, belum diverifikasi per grade'
FROM legacy_source_rows WHERE source_sheet='STOCK KM' AND data->>5 ~ '^[0-9]+$'
ORDER BY source_row DESC LIMIT 1 ON CONFLICT(source_sheet) DO NOTHING;

INSERT INTO migration_checkpoints(source_key,source_hash,record_count,note)
SELECT source_sheet,md5(string_agg(source_row::text||data::text,'|' ORDER BY source_row)),
COUNT(*)::int,'KELAPA GO; pivot referensi tidak dihitung dua kali'
FROM legacy_source_rows GROUP BY source_sheet
ON CONFLICT(source_key) DO UPDATE SET source_hash=EXCLUDED.source_hash,
record_count=EXCLUDED.record_count,imported_at=now();
