import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=(p:string)=>readFile(p,"utf8");

test("Source migration excludes two forbidden sheets and keeps pivot derived",async()=>{
 const sql=await read("database/024_kelapa_go_project_historical.sql");
 const spec=await read("src/lib/kelapa-go-operations.ts");
 assert.match(sql,/source_sheet='KWITANSI'/);
 assert.match(sql,/source_sheet='KAS KECIL'/);
 assert.match(sql,/source_sheet='INVENTARIS'/);
 assert.doesNotMatch(sql,/source_sheet='Data Produksi'|source_sheet='NOTA KELUAR'/);
 assert.match(spec,/recordCombinedPurchase/);
 assert.match(spec,/recordDailyProduction/);
 const ui=await read("src/app/(private)/owner/legacy/page.tsx");
 assert.match(ui,/Pivot UNPAID/);
 assert.match(ui,/v_kelapa_go|legacyReceiptsSummary/);
});
test("Produksi menghilangkan pilihan batch dari form dan menjaga alokasi",async()=>{
 const form=await read("src/components/go-production-composer.tsx");
 const op=await read("src/lib/kelapa-go-operations.ts");
 assert.doesNotMatch(form,/name="batchId"/);
 assert.match(form,/Rusak saat produksi/);
 assert.match(op,/x\.quantity,0\)\+input\.damaged!==input\.used/);
 assert.match(op,/FOR UPDATE OF b/);
 assert.match(op,/raw_material_cost/);
});
test("Nota dibuat per pengiriman, bukan saat membuat order",async()=>{
 const op=await read("src/lib/order-operations.ts");
 const dispatch=op.slice(op.indexOf("export async function dispatchOrder"),op.indexOf("export async function payOrder"));
 const order=op.slice(op.indexOf("export async function createOrder"),op.indexOf("export async function dispatchOrder"));
 assert.match(order,/document_number\) VALUES\(/);
 assert.match(order,/true,\(now\(\) AT TIME ZONE 'Asia\/Makassar'\)::date,NULL/);
 assert.match(dispatch,/SELECT allocate_stokly_receipt_number\(\) AS number/);
 assert.match(dispatch,/INSERT INTO delivery_notes.*document_number/);
 assert.match(dispatch,/INSERT INTO receipt_register/);
 assert.match(op,/cash_ledger_entries/);
});
test("Admin retains original features; Rute & Ongkir removed from active UI",async()=>{
 const nav=await read("src/components/shell.tsx");
 for(const feature of ["Order & Pengiriman","Kwitansi & Pembayaran","Retur & Komplain","Kunjungan Marketing","Inventaris & Keranjang","Kas Kecil"])
  assert.match(nav,new RegExp(feature));
 assert.doesNotMatch(nav,/Rute & Ongkir|href:"\/routes"/);
 const routes=await read("src/app/(private)/routes/page.tsx");
 assert.match(routes,/redirect\("\/cash"\)/);
});
test("Owner historical and cash pages are protected",async()=>{
 const pages=["src/app/(private)/owner/legacy/page.tsx","src/app/(private)/cash/page.tsx","src/app/(private)/inventory/page.tsx","src/app/(private)/invoices/legacy/page.tsx"];
 for(const file of pages){const c=await read(file);assert.match(c,/await require(Owner|Actor)\(/);}
});

test("Receipt activation cannot pre-number undelivered orders",async()=>{
 const setup=await read("src/lib/receipt-setup.ts");
 assert.match(setup,/Seri nomor sudah aktif/);
 assert.doesNotMatch(setup,/UPDATE customer_orders SET document_number=allocate_stokly_receipt_number/);
 const reconcile=await read("src/lib/receipt-reconciliation.ts");
 assert.match(reconcile,/Kirim order terlebih dahulu/);
 assert.match(reconcile,/receipt_register/);
});
test("Inventory is aware of damaged and outlet-specific borrowed units",async()=>{
 const source=await read("src/lib/kelapa-go-operations.ts");
 const page=await read("src/app/(private)/inventory/page.tsx");
 assert.match(source,/outlet_id=\$2/);
 assert.match(source,/const available=asset.rows\[0\].quantity/);
 assert.match(page,/kind='DAMAGED'/);
});
test("Derived daily pivot reports remain read-only SQL views",async()=>{
 const sql=await read("database/025_kelapa_go_dynamic_reports.sql");
 for(const view of ["v_go_sales_daily","v_go_outlet_daily","v_go_cash_category_live","v_go_kasbon"])
  assert.match(sql,new RegExp(view));
 assert.match(sql,/FROM legacy_receipts/);
 assert.doesNotMatch(sql,/INSERT INTO customer_orders|INSERT INTO delivery_notes/);
});
