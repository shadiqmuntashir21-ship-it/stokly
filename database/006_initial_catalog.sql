-- STOKLY V2 default catalog only. Prices and opening stock must be supplied by AFI Ara.
INSERT INTO products(sku,name,category,unit,description,price,min_stock)
VALUES
 ('PRD-001','Kelapa Serut','Kelapa','PCS','Produk kelapa serut',0,5),
 ('PRD-002','Kelapa Batok','Kelapa','BUTIR','Produk kelapa batok',0,5),
 ('PRD-003','Kelapa Cup','Kelapa','CUP','Produk kelapa cup',0,5),
 ('PRD-004','Santan','Kelapa','LITER','Produk santan; satuan disesuaikan saat penetapan kemasan',0,5)
ON CONFLICT(sku) DO NOTHING;
INSERT INTO inventory_balances(product_id,quantity)
SELECT id,0 FROM products
WHERE sku IN ('PRD-001','PRD-002','PRD-003','PRD-004')
ON CONFLICT(product_id) DO NOTHING;
