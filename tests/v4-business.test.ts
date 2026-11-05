import test from "node:test";
import assert from "node:assert/strict";
import {invoiceBalance,formatReceiptNumber,toCents} from "../src/lib/business-math";
test("nomor kwitansi tujuh digit, tanpa awalan",()=>{
 assert.equal(formatReceiptNumber(1),"0000001");
 assert.equal(formatReceiptNumber(9000000),"9000000");
 assert.throws(()=>formatReceiptNumber(10000000));
 assert.throws(()=>formatReceiptNumber(0));
});
test("piutang setelah pengiriman dan pembayaran sebagian",()=>{
 assert.deepEqual(invoiceBalance(500000,50000,200000),{final:450000,due:250000,overpaid:0});
});
test("pelunasan",()=>{assert.deepEqual(invoiceBalance(120000,0,120000),{final:120000,due:0,overpaid:0});});
test("refund setelah lunas",()=>{assert.deepEqual(invoiceBalance(500000,320000,500000),{final:180000,due:0,overpaid:320000});});
test("harga dengan pecahan rupiah dihitung sebagai sen bulat",()=>{
 assert.equal(toCents("10.25"),1025);
 assert.equal(invoiceBalance(100.50,20.25,10.10).due,70.15);
});
test("retur melebihi nilai pengiriman ditolak",()=>{assert.throws(()=>invoiceBalance(10000,20000,0));});
