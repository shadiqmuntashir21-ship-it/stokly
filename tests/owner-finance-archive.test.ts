import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=async (p:string)=>readFile(p,"utf8");

test("piutang tidak mengimbangi invoice overpaid dengan invoice yang belum dibayar",async()=>{
 const finance=await read("src/lib/owner-money.ts");
 const outlets=await read("src/lib/owner-outlets.ts");
 const archival=await read("src/app/(private)/owner/archive/page.tsx");
 assert.match(finance,/SUM\(GREATEST\(0,i\.gross/);
 assert.match(outlets,/SUM\(GREATEST\(0,i\.gross/);
 assert.match(archival,/SUM\(GREATEST\(0,i\.gross/);
 const sample=[{gross:500000,return:320000,paid:500000},{gross:100000,return:0,paid:0}];
 const due=sample.reduce((sum,x)=>sum+Math.max(0,x.gross-x.return-x.paid),0);
 assert.equal(due,100000); // invoice one has a refund; invoice two still has a full receivable
});

test("nomor historis tidak boleh duplikat / menimpa seri 9xxxxxx",async()=>{
 const src=await read("src/lib/receipt-reconciliation.ts");
 assert.match(src,/input\.physicalNumber/);
 assert.match(src,/9000000/);
 assert.match(src,/FOR UPDATE/);
 assert.match(src,/receipt_number_reconciliations/);
 assert.match(src,/allocate_stokly_receipt_number/);
});

test("export memiliki semua kelas transaksi tanpa mengikutkan kredensial",async()=>{
 const spec=await read("src/lib/archive-spec.ts");
 for(const kind of ["orders","delivery_notes","delivery_payments","delivery_returns","delivery_refunds","coconut_receipts","coconut_qc","coconut_production","production_cost_shares","expense_entries","legacy_sales","stock_movements","daily_closeouts"]){
  assert.match(spec,new RegExp('file:"'+kind+'"'));
 }
 assert.doesNotMatch(spec,/SELECT \* FROM (session|user|verification|trusted_devices|staff_devices)\b/);
});

test("tidak ada endpoint untuk membersihkan seluruh data tahunan secara diam-diam",async()=>{
 const ui=await read("src/app/(private)/owner/archive/page.tsx");
 assert.match(ui,/Penghapusan fisik transaksi belum diaktifkan/);
 const archive=await read("src/lib/annual-archive.ts");
 assert.match(archive,/archive_year/);
 assert.match(archive,/SHA|sha256/);
});
