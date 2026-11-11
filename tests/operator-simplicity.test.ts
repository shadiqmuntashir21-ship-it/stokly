import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=(name:string)=>readFile(name,"utf8");
test("QC no longer asks operator to select a batch",async()=>{
 const page=await read("src/app/(private)/qc/page.tsx");
 assert.doesNotMatch(page,/<select[^>]*name="batchId"/);
 assert.doesNotMatch(page,/Pilih batch|Rekap batch & QC/);
 assert.match(page,/type="hidden" name="batchId" value=\{r.batch_id\}/);
 assert.match(page,/r\.supplier/);
 assert.match(page,/r\.grade/);
 assert.match(page,/new Date\(r.received_at\)/);
});
test("Products create with automatic SKU; edit retains the existing code",async()=>{
 const page=await read("src/app/(private)/products/page.tsx");
 const actions=await read("src/app/(private)/v2-actions.ts");
 const logic=await read("src/lib/v2-master.ts");
 assert.doesNotMatch(page,/<input[^>]*name="sku"/);
 assert.doesNotMatch(actions,/sku:v\(f,"sku"\)/);
 assert.match(logic,/pg_advisory_xact_lock/);
 assert.match(logic,/substring\(sku from/);
 assert.match(logic,/const sku="PRD-"/);
 assert.match(logic,/UPDATE products SET name=\$2/);
 assert.doesNotMatch(logic,/UPDATE products SET sku=/);
});
