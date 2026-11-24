import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=(p:string)=>readFile(p,"utf8");
test("KELAPA GO is the visible identity in metadata, PWA, Room and application shell",async()=>{
 const [brand,meta,manifest,rooms,shell,offline]=await Promise.all([
  source("src/components/brand.tsx"),source("src/app/layout.tsx"),source("src/app/manifest.ts"),
  source("src/app/rooms/page.tsx"),source("src/components/shell.tsx"),source("public/offline.html")
 ]);
 assert.match(brand,/kelapa-go-symbol\.svg/);
 assert.match(meta,/applicationName:"KELAPA GO"/);
 assert.match(manifest,/short_name:"KELAPA GO"/);
 assert.match(rooms,/Room Owner/);
 assert.match(shell,/actor\.role==="owner"\?"Room Owner"/);
 for(const f of [brand,meta,manifest,shell,offline])assert.doesNotMatch(f,/>STOKLY|STOKLY —|STOKLY ·/);
});
test("Owner analytics keep historical and live sales independent, with separate cash flow",async()=>{
 const [analytics,owner]=await Promise.all([source("src/lib/dashboard-analytics.ts"),source("src/app/(private)/owner/page.tsx")]);
 assert.match(analytics,/source==="legacy"/);
 assert.match(analytics,/FROM legacy_receipts/);
 assert.match(analytics,/FROM delivery_notes d JOIN delivery_invoices/);
 assert.match(analytics,/FROM cash_ledger_entries/);
 assert.match(analytics,/category<>'PENJUALAN TRANSFER'/);
 assert.match(owner,/Analitik & Insight Bisnis/);
 assert.match(owner,/Periode khusus/);
 assert.match(owner,/Insight Otomatis/);
 assert.match(owner,/Arus Kas Kecil/);
});
test("Admin has nonfinancial charts and stock by product, marketing remains restricted",async()=>{
 const [analytics,dashboard]=await Promise.all([source("src/lib/dashboard-analytics.ts"),source("src/app/(private)/dashboard/page.tsx")]);
 assert.match(dashboard,/actor\.role!=="marketing"\?adminAnalytics\(\):Promise\.resolve\(null\)/);
 assert.match(dashboard,/Produksi vs Pengiriman per Jenis/);
 assert.match(dashboard,/QualityBars/);
 assert.match(analytics,/GO-MAKAN-FULL/);
 assert.match(analytics,/GO-KELAPA-TAR/);
 assert.match(analytics,/GO-SERUT/);
});
test("UUID validation recognizes the complete five-group shape",async()=>{
 const files=["src/lib/order-operations.ts","src/lib/legacy-payments.ts","src/lib/receipt-reconciliation.ts"];
 for(const f of files){const s=await source(f);assert.match(s,/\[a-f0-9\]\{8\}-\[a-f0-9\]\{4\}-\[a-f0-9\]\{4\}-\[a-f0-9\]\{4\}-\[a-f0-9\]\{12\}/);}
});
