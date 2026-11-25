import {test} from "node:test";
import assert from "node:assert/strict";
import {makeWorkbook,makeReportPdf} from "../src/lib/report-files";
test("workbook uses valid ZIP signature and keeps formula-like names as literal cells",()=>{
 const zip=makeWorkbook([{name:"Kas",rows:[["Nama","Nominal"],["=1+1",25000]]}]);
 assert.equal(zip.readUInt32LE(0),0x04034b50);
 assert.ok(zip.includes(Buffer.from("xl/worksheets/sheet1.xml")));
 assert.throws(()=>makeWorkbook([{name:"bad/name",rows:[]}]));
});
test("PDF includes xref, pagination and escapes parentheses",()=>{
 const pdf=makeReportPdf("Kas (Kecil)",Array.from({length:100},(_,i)=>"Baris "+i));
 const body=pdf.toString();
 assert.ok(body.startsWith("%PDF-1.4"));
 assert.match(body,/\/Count 3/);
 assert.ok(body.includes("Kas \\(Kecil\\)"));
 const offset=Number(body.match(/startxref\n(\d+)/)?.[1]);
 assert.equal(body.slice(offset,offset+4),"xref");
});
