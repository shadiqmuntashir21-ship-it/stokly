import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const load=(path:string)=>readFile(path,"utf8");
test("Owner priority and Top Outlet cards are independent equal-width panels, outside Insight",async()=>{
 const file=await load("src/app/(private)/owner/page.tsx");
 const priorities=file.indexOf('className="kg-owner-grid kg-owner-priorities"');
 const insight=file.indexOf('<Panel title="Insight Otomatis"');
 const analytics=file.indexOf('Tren Penjualan Bersih');
 assert.ok(priorities>analytics&&priorities<insight,"Priority grid must be outside the insight body");
 assert.match(file,/className="kg-owner-grid kg-owner-secondary"/);
 assert.match(file,/className="metrics-grid kg-owner-kpis"/);
});
test("Executive compact currency respects magnitude, count grouping and exact amount labels",async()=>{
 const {formatMoneyCompact,formatCount}=await import("../src/lib/display-numbers");
 assert.equal(formatCount(1610),"1.610");
 assert.equal(formatMoneyCompact(340996500),"Rp 341 juta");
 assert.equal(formatMoneyCompact(9725000),"Rp 9,7 juta");
 assert.equal(formatMoneyCompact(0),"Rp 0");
 assert.equal(formatMoneyCompact(125000),"Rp 125 ribu");
 assert.equal(formatMoneyCompact(1300000000),"Rp 1,3 miliar");
 const history=await load("src/app/(private)/owner/legacy/page.tsx");
 assert.match(history,/kg-exact-value/);
 assert.match(history,/title=\{rupiah\(summary.stat.gross\)\}/);
});
test("Top five ranking presents full names, readable amounts and consistent spacing",async()=>{
 const chart=await load("src/components/business-charts.tsx");
 const css=await load("src/app/kelapago.css");
 assert.match(chart,/kg-rank-name/);
 assert.match(chart,/kg-rank-details/);
 assert.match(chart,/formatMoneyCompact\(x.value\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:780px\)/);
});
