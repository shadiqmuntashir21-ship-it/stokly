import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeReceiptNumber} from "../src/lib/receipt-number-format";
import {makeReportPdf} from "../src/lib/report-files";
test("manual receipt format preserves zeros and rejects invalid numbers",()=>{
 assert.equal(normalizeReceiptNumber("1635"),"0001635");assert.equal(normalizeReceiptNumber("0001635"),"0001635");assert.equal(normalizeReceiptNumber("1000000"),"1000000");for(const s of ["0","0000000","12345678","1.2","AB123","-1",""])assert.equal(normalizeReceiptNumber(s),null);
});
test("sales PDF contains vector chart and pagination",()=>{
 const p=makeReportPdf("KELAPA GO",Array.from({length:50},(_,i)=>"Line "+i),[{label:"25/11",value:500000}]).toString();assert.match(p,/re f/);assert.match(p,/Grafik penjualan bersih/);assert.match(p,/\/Count 2/);assert.ok(p.includes("Line 49"));
});
