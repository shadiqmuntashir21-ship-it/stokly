import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {rupiahDigits,nominalLabel} from "../src/lib/rupiah-input";
const read=(path:string)=>readFile(path,"utf8");

test("Penulisan ribuan tidak mengurangi nominal 30.000 menjadi 30",()=>{
 assert.equal(rupiahDigits("030.000"),30000);
 assert.equal(rupiahDigits("1.500.000"),1500000);
 assert.equal(rupiahDigits("30000"),30000);
 assert.equal(25*rupiahDigits("030.000"),750000);
 assert.match(nominalLabel(750000),/750 ribu/);
 assert.match(nominalLabel(1500000),/1,5 juta/);
});

test("Nota langsung tampil setelah order berhasil tersimpan",async()=>{
 const action=await read("src/app/(private)/order-actions.ts");
 const page=await read("src/app/(private)/orders/page.tsx");
 const service=await read("src/lib/order-operations.ts");
 assert.match(action,/redirect\("\/orders\?success=1&receipt="/);
 assert.match(page,/Order tersimpan! Nomor nota:/);
 assert.match(service,/\bRESERVED\b/);
 assert.match(service,/\bISSUED\b/);
});

test("Kas Kecil dan Kas Besar tidak saling tercampur",async()=>{
 const service=await read("src/lib/order-operations.ts");
 const page=await read("src/app/(private)/cash/page.tsx");
 const payment=await read("src/lib/legacy-payments.ts");
 assert.match(service,/PENJUALAN TRANSFER/);
 assert.match(payment,/PENJUALAN TRANSFER/);
 assert.match(page,/walletBalances/);
 assert.match(await read("src/lib/operational-cash.ts"),/category LIKE 'KAS BESAR:%'/);
 assert.match(page,/Sumber uang/);
});

test("Inventaris cari nama dan wajib outlet saat dipinjamkan",async()=>{
 const page=await read("src/app/(private)/inventory/page.tsx");
 const form=await read("src/components/inventory-movement-form.tsx");
 assert.match(page,/InventorySearch/);
 assert.match(form,/required=\{needsOutlet\}/);
});
test("Piutang hanya dikoreksi dengan audit bukan pembayaran palsu",async()=>{
 const ledger=await read("src/lib/legacy-payments.ts");
 const action=await read("src/app/(private)/invoices/legacy/actions.ts");
 assert.match(ledger,/legacy_receipt_balance_reviews/);
 assert.match(action,/requireOwner/);
 assert.match(ledger,/input.reason.trim\(\).length<10/);
});
