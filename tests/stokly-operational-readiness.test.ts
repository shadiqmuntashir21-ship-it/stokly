import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=(p:string)=>readFile(p,"utf8");
test("Stok jadi membaca saldo aktual, produksi dan pengiriman per kategori",async()=>{
 const s=await read("src/lib/finished-stock.ts");
 assert.match(s,/inventory_balances/);
 assert.match(s,/coconut_production_day_outputs/);
 assert.match(s,/delivery_note_items/);
 assert.match(s,/dn.delivered_on=\$1::date/);
 assert.doesNotMatch(s,/legacy_stock_snapshots/);
 assert.doesNotMatch(s,/GO-RUSAK/);
});
test("Autocomplete pilihan menyimpan ID dan bukan teks bebas",async()=>{
 const s=await read("src/components/searchable-choice.tsx");
 assert.match(s,/role="combobox"/);
 assert.match(s,/onChange\(choice.id\)/);
 assert.match(s,/onChange\(""\)/);
 const order=await read("src/components/order-composer.tsx");
 assert.match(order,/name="outletId" value=\{outlet\}/);
 const dispatch=await read("src/components/dispatch-composer.tsx");
 assert.match(dispatch,/SearchableChoice/);
 assert.match(dispatch,/String\(Number\(x.number\)\)/);
});
test("Saldo awal independen dan hanya Owner yang dapat mengaturnya",async()=>{
 const service=await read("src/lib/operational-cash.ts");
 assert.doesNotMatch(service,/legacy_cash_entries/);
 assert.match(service,/ON CONFLICT\(wallet\) DO NOTHING/);
 assert.match(service,/PENJUALAN TRANSFER/);
 assert.match(service,/ELSE NULL END balance/);
 const action=await read("src/app/(private)/go-actions.ts");
 assert.match(action.slice(action.indexOf("export async function openingCashAction")),/requireOwner\(\)/);
 const history=await read("src/app/(private)/owner/legacy/page.tsx");
 assert.doesNotMatch(history,/FROM v_go_cash_category_live/);
});
test("Room Owner tanpa nama personal di sidebar dan avatar",async()=>{
 const s=await read("src/components/shell.tsx");
 assert.match(s,/actor.role==="owner"\?"Room Owner":actor.name/);
 assert.equal((s.match(/actor.role==="owner"\?"O":actor.name.charAt/g)||[]).length,2);
});
