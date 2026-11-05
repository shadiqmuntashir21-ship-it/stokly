import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inflateRawSync} from "node:zlib";
import {crc32,makeZip} from "../src/lib/zip-writer";
const read=(p:string)=>readFile(p,"utf8");
test("ZIP arsip kompatibel dan CRC32 valid",()=>{
 const raw=Buffer.from('STOKLY ARSIP - 2026: kopi,kelapa');
 assert.equal(crc32(Buffer.from("123456789")),0xcbf43926);
 const zip=makeZip([{name:"manifest.json",data:'{"year":2026}'},{name:"orders.csv",data:raw}]);
 assert.equal(zip.readUInt32LE(0),0x04034b50);
 const nameSize=zip.readUInt16LE(26),compressedSize=zip.readUInt32LE(18);
 const compressed=zip.subarray(30+nameSize,30+nameSize+compressedSize);
 assert.equal(inflateRawSync(compressed).toString(),'{"year":2026}');
 assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
 assert.throws(()=>makeZip([{name:"../secrets",data:"x"}]));
});
test("Owner pages membutuhkan sesi PIN Owner",async()=>{
 for(const f of [
  "src/app/(private)/owner/page.tsx",
  "src/app/(private)/owner/finance/page.tsx",
  "src/app/(private)/owner/outlets/page.tsx",
  "src/app/(private)/owner/operations/page.tsx",
  "src/app/(private)/owner/receipts/page.tsx",
  "src/app/(private)/owner/archive/page.tsx",
  "src/app/(private)/owner/settings/page.tsx"
 ]){
  const content=await read(f);
  assert.match(content,/requireOwner\(\)/,f);
 }
 const archive=await read("src/app/api/owner/archive/[year]/route.ts");
 assert.match(archive,/await requireOwner\(\)/);
});
test("Owner dashboard terpisah, Admin dan Marketing tetap bebas masuk",async()=>{
 const dash=await read("src/app/(private)/dashboard/page.tsx");
 const shell=await read("src/components/shell.tsx");
 const access=await read("src/lib/access.ts");
 assert.match(dash,/redirect\("\/owner"\)/);
 assert.match(shell,/actor.role==="owner"\?ownerGroups:groups/);
 assert.match(access,/return staffActor\(room\)/);
 assert.doesNotMatch(access,/getStaffDevice|DEVICE_COOKIE/);
});
test("Arsip tidak melakukan DELETE data transaksi",async()=>{
 const source=await read("src/lib/annual-archive.ts");
 const route=await read("src/app/api/owner/archive/[year]/route.ts");
 assert.doesNotMatch(source,/\bDELETE\s+FROM\b|\bTRUNCATE\b|\bDROP\s+TABLE\b/i);
 assert.match(source,/REPEATABLE READ READ ONLY/);
 assert.match(route,/application\/zip/);
});
