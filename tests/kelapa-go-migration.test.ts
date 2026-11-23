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
test("Nota dibuat saat order disimpan dan dipakai saat pengiriman pertama",async()=>{
 const op=await read("src/lib/order-operations.ts");
 const dispatch=op.slice(op.indexOf("export async function dis¶»§q«^