-- Historical receipts and serial transition: apply after importing legacy receipt tables.
INSERT INTO receipt_register(document_number,status,note)
 SELECT document_number,'ISSUED','Histori KWITANSI KELAPA GO'
 FROM legacy_receipts ON CONFLICT(document_number) DO NOTHING;
INSERT INTO receipt_register(document_number,status,note)
 SELECT document_number,'VOID','Nomor rusak historis KELAPA GO'
 FROM legacy_void_receipts ON CONFLICT(document_number) DO NOTHING;
INSERT INTO inventory_balances(product_id,quantity)
 SELECT id,0 FROM products ON CONFLICT(product_id) DO NOTHING;
-- Keep this guarded: production must match the verified source before the counter moves.
UPDATE receipt_number_settings SET next_number=1620,updated_at=now()
 WHERE singleton=true AND next_number=9000000
 AND NOT EXISTS(SELECT 1 FROM customer_orders WHERE document_number IS NOT NULL)
 AND NOT EXISTS(SELECT 1 FROM receipt_register WHERE document_number='0001620');
CREATE OR REPLACE FUNCTION public.allocate_stokly_receipt_number()
 RETURNS character varying LANGUAGE plpgsql AS $fn$
DECLARE n integer; allocated varchar;
BEGIN
 LOOP
  UPDATE receipt_number_settings SET next_number=next_number+1,updated_at=now()
  WHERE singleton=true AND next_number BETWEEN 1 AND 9999999
  RETURNING next_number-1 INTO n;
  IF n IS NULL THEN RETURN NULL; END IF;
  allocated:=lpad(n::text,7,'0');
  EXIT WHEN NOT EXISTS(SELECT 1 FROM receipt_register WHERE document_number=allocated)
   AND NOT EXISTS(SELECT 1 FROM legacy_receipts WHERE document_number=allocated)
   AND NOT EXISTS(SELECT 1 FROM legacy_void_receipts WHERE document_number=allocated)
   AND NOT EXISTS(SELECT 1 FROM customer_orders WHERE document_number=allocated);
 END LOOP;
 RETURN allocated;
END $fn$;
