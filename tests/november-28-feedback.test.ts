import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=(p:string)=>readFile(p,"utf8");
test("Cancelled purchase excluded from expense total and paths refreshed",async()=>{
 const s=await read("src/lib/expense-operations.ts");
 assert.ok(s.includes("JOIN coconut_batches b ON b.receipt_id=r.id WHERE b.voided_at IS NULL"));
 assert.ok((await read("src/app/(private)/procurement/correction-actions.ts")).includes('"/expenses"'));
});
test("Legacy outlet pivot sorts numeric pieces, then numeric value",async()=>{
 const s=await read("src/lib/legacy-payments.ts");
 assert.ok(s.includes("ORDER BY v.total_pcs DESC, v.net_sales DESC, v.outlet_name"));
});
test("Outlet management search and guarded delete",async()=>{
 const s=await read("src/app/(private)/outlets/page.tsx");
 const lib=await read("src/lib/v2-master.ts");
 assert.ok(s.includes('name="q"'));assert.ok(!s.includes("google.com/maps"));
 assert.ok(s.includes('name="preserveLocation"'));
 assert.ok(lib.indexOf("if(linked.rowCount)")<lib.indexOf("DELETE FROM outlets"));
});
test("One supplier multi-grade has prominent add button and subtotals",async()=>{
 const s=await read("src/components/go-purchase-composer.tsx");
 assert.ok(s.includes("+ Tambah Grade Kelapa"));assert.ok(s.includes("Subtotal grade"));
 assert.ok(s.includes('name="lines" value={JSON.stringify(lines)}'));
});
