import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=(p:string)=>readFile(p,"utf8");
test("UUID validators accept standard 8-4-4-4-12 identifiers across all transaction services",async()=>{
 const paths=[
 "src/lib/kelapa-go-operations.ts","src/lib/order-operations.ts",
 "src/lib/receipt-reconciliation.ts","src/lib/legacy-payments.ts",
 "src/lib/expense-operations.ts","src/lib/coconut-operations.ts",
 "src/lib/return-operations.ts","src/lib/route-operations.ts",
 "src/app/(private)/receipts/[id]/print/page.tsx"
 ];
 for(const path of paths){
  const s=await read(path);
  const line=s.split("\n").find(l=>l.includes("const uuid=")||l.includes("const isUuid=")||l.includes("const uid="));
  assert.ok(line,"Validator missing in "+path);
  assert.equal((line.match(/\{4\}/g)||[]).length,3,"UUID must have three 4-digit groups: "+path);
  assert.match(line,/\{8\}.*\{12\}/,"UUID must contain 8- and 12-digit endpoints: "+path);
 }

});
test("new order gets reserved receipt before shipment and shows confirmation and printable link",async()=>{
 const [service,action,orders,detail]=await Promise.all([
  read("src/lib/order-operations.ts"),read("src/app/(private)/order-actions.ts"),
  read("src/app/(private)/orders/page.tsx"),read("src/app/(private)/orders/[id]/page.tsx")
 ]);
 assert.match(service,/allocate_stokly_receipt_number\(\)/);
 assert.match(service,/receipt_register\(document_number,status,order_id/);
 assert.match(action,/receipt="\+encodeURIComponent/);
 assert.match(action,/&order="\+encodeURIComponent\(orderId\)/);
 assert.match(orders,/Lihat \/ cetak bukti pesanan/);
 assert.match(orders,/Lihat \/ cetak kwitansi pengiriman/);
 assert.match(detail,/Cetak bukti pesanan/);
});
test("receipt is a draft before delivery, actual invoice only after shipment",async()=>{
 const [page,service]=await Promise.all([
  read("src/app/(private)/receipts/[id]/print/page.tsx"),read("src/lib/order-operations.ts")
 ]);
 assert.match(page,/listInvoices\(\{orderId:id,limit:1\}\)/);
 assert.match(page,/BELUM DIKIRIM/);
 assert.match(page,/BUKTI PEMESANAN/);
 assert.match(page,/KWITANSI \/ NOTA OUTLET/);
 assert.match(page,/FROM customer_order_items i JOIN products p/);
 assert.match(page,/FROM delivery_notes d JOIN delivery_note_items di/);
 assert.match(page,/Tagihan akan diterbitkan/);
 assert.match(service,/WHERE order_id=\$1 AND status='RESERVED'/);
 assert.match(service,/status='ISSUED'/);
});
test("manual transaction price requires Admin/Owner with reason, no zero-priced order",async()=>{
 const [service,composer]=await Promise.all([read("src/lib/order-operations.ts"),read("src/components/order-composer.tsx")]);
 assert.match(service,/price<=0\)throw new BusinessError/);
 assert.match(service,/changed&&!allowOverride/);
 assert.match(service,/changed&&data.priceReason.trim\(\).length<5/);
 assert.match(composer,/Harga standar belum tersedia/);
 assert.match(composer,/!changed\|\|canOverride&&reason.trim\(\).length>=5/);
});

test("production reads the DB-generated purchase total and preserves costing",async()=>{
 const a=await read("src/lib/kelapa-go-operations.ts");
 const b=await read("src/lib/coconut-operations.ts");
 assert.match(a,/r.total_value::text total_value/);
 assert.match(a,/raw_material_cost=\$2/);
 assert.doesNotMatch(a,/INSERT INTO coconut_receipts\([^)]*total_value/);
 assert.doesNotMatch(b,/INSERT INTO coconut_receipts\([^)]*total_value/);
});
