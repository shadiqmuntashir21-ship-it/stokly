import {randomUUID} from "node:crypto";
import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";

const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const day=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
const count=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<10000000;
const price=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1000000000&&Number.isSafeInteger(Math.round(n*100));
export type PurchaseLine={gradeId:string;quantity:number;unitPrice:number;passed:number;rejected:number};
export async function recordCombinedPurchase(input:{requestKey:string;supplierId:string;date:string;note:string;lines:PurchaseLine[]},actor:string){
 if(!uuid(input.requestKey)||!uuid(input.supplierId)||!day(input.date)||!Array.isArray(input.lines)||
 input.lines.length<1||input.lines.length>15||input.lines.some(x=>!uuid(x.gradeId)||!count(x.quantity)||x.quantity<1||
 (!price(x.unitPrice)||x.unitPrice<=0)||!count(x.passed)||!count(x.rejected)||x.passed+x.rejected>x.quantity)||
 new Set(input.lines.map(x=>x.gradeId)).size!==input.lines.length)throw new BusinessError("Periksa grade, jumlah, harga dan hasil QC. QC tidak boleh melebihi pembelian.");
 return transaction(async c=>{
  const old=await c.query<{id:string}>("SELECT id::text FROM kelapa_go_purchase_groups WHERE request_key=$1",[input.requestKey]);
  if(old.rows[0])return old.rows[0].id;
  const supplier=await c.query("SELECT id FROM suppliers WHERE id=$1 AND active=true",[input.supplierId]);
  if(!supplier.rowCount)throw new BusinessError("Supplier tidak ditemukan.");
  const gs=await c.query<{id:string}>("SELECT id::text FROM coconut_grades WHERE active=true AND id=ANY($1::uuid[])",[input.lines.map(x=>x.gradeId)]);
  if(gs.rowCount!==input.lines.length)throw new BusinessError("Grade tidak tersedia.");
  const group=await c.query<{id:string}>(
   "INSERT INTO kelapa_go_purchase_groups(request_key,supplier_id,received_date,note,actor_id) VALUES($1,$2,$3,$4,$5) RETURNING id::text",
   [input.requestKey,input.supplierId,input.date,input.note.slice(0,400),actor]);
  for(const x of input.lines){
   const r=await c.query<{id:string}>(
    "INSERT INTO coconut_receipts(request_key,supplier_id,grade_id,quantity,price_per_butir,note,created_by,received_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::date + TIME '12:00') RETURNING id::text",
    [randomUUID(),input.supplierId,x.gradeId,x.quantity,x.unitPrice,"Pembelian+QC · "+input.note.slice(0,250),actor,input.date]);
   await c.query("INSERT INTO coconut_batches(receipt_id,received_qty,accepted_qty,rejected_qty) VALUES($1,$2,$3,$4)",
    [r.rows[0].id,x.quantity,x.passed,x.rejected]);
   await c.query("INSERT INTO kelapa_go_purchase_rows(group_id,receipt_id) VALUES($1,$2)",[group.rows[0].id,r.rows[0].id]);
   if(x.passed+x.rejected>0){
    const batch=await c.query<{id:string}>("SELECT id::text FROM coconut_batches WHERE receipt_id=$1",[r.rows[0].id]);
    await c.query("INSERT INTO coconut_qc(request_key,batch_id,inspected_qty,passed_qty,rejected_qty,reject_reason,inspected_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [randomUUID(),batch.rows[0].id,x.passed+x.rejected,x.passed,x.rejected,x.rejected>0?"Afkir saat pembelian/QC":"",actor]);
   }
   await c.query("INSERT INTO supplier_prices(supplier_id,grade_id,unit,unit_price,note,created_by) VALUES($1,$2,'BUTIR',$3,$4,$5)",
    [input.supplierId,x.gradeId,x.unitPrice,"Harga pembelian "+input.date,actor]);
  }
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'go.purchase.qc','purchase',$2)",
   [actor,group.rows[0].id]);
  return group.rows[0].id;
 });
}
export type ProductionLine={productId:string;quantity:number};
export async function recordDailyProduction(input:{requestKey:string;date:string;used:number;damaged:number;note:string;outputs:ProductionLine[]},actor:string){
 if(!uuid(input.requestKey)||!day(input.date)||!count(input.used)||input.used<1||
 !count(input.damaged)||input.damaged>input.used||!Array.isArray(input.outputs)||input.outputs.length>20||input.outputs.some(x=>!uuid(x.productId)||!count(x.quantity)||x.quantity<1)||
 new Set(input.outputs.map(x=>x.productId)).size!==input.outputs.length||
 input.outputs.reduce((n,x)=>n+x.quantity,0)+input.damaged!==input.used)
  throw new BusinessError("Jumlah hasil layak jual + kelapa rusak harus tepat sama dengan kelapa yang diproses.");
 return transaction(async c=>{
  const prior=await c.query<{id:string}>("SELECT id::text FROM coconut_production_days WHERE request_key=$1",[input.requestKey]);
  if(prior.rows[0])return prior.rows[0].id;
  const productIds=input.outputs.map(x=>x.productId).sort();
  const prods=await c.query<{id:string;category:string}>("SELECT id::text,category FROM products WHERE active=true AND id=ANY($1::uuid[])",[productIds]);
  if(prods.rowCount!==productIds.length||prods.rows.some(x=>x.category==="Afkir"))
   throw new BusinessError("Produk hasil produksi tidak valid atau termasuk kategori afkir.");
  const batches=await c.query<{id:string;available:number;accepted:number;total_value:string}>(
   "SELECT b.id::text,(b.accepted_qty-b.consumed_qty)::int available,b.accepted_qty accepted,r.total_value::text total_value FROM coconut_batches b JOIN coconut_receipts r ON r.id=b.receipt_id WHERE b.accepted_qty>b.consumed_qty ORDER BY r.received_at,b.id FOR UPDATE OF b");
  if(batches.rows.reduce((s,x)=>s+x.available,0)<input.used)
   throw new BusinessError("Bahan baku lolos QC tidak cukup. Catat pembelian dan QC terlebih dahulu.");
  const created=await c.query<{id:string}>(
   "INSERT INTO coconut_production_days(request_key,production_date,coconut_used,damaged_qty,note,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text",
   [input.requestKey,input.date,input.used,input.damaged,input.note.slice(0,400),actor]);
  let remaining=input.used,costCents=0;
  for(const b of batches.rows){
   if(remaining<=0)break;
   const taken=Math.min(remaining,b.available);
   const amount=Math.round((Number(b.total_value)/b.accepted)*taken*100);
   costCents+=amount;remaining-=taken;
   await c.query("UPDATE coconut_batches SET consumed_qty=consumed_qty+$2 WHERE id=$1",[b.id,taken]);
   await c.query("INSERT INTO coconut_production_day_consumptions(production_id,batch_id,quantity,raw_cost) VALUES($1,$2,$3,$4)",
    [created.rows[0].id,b.id,taken,amount/100]);
  }
  const saleable=input.used-input.damaged,unitCost=saleable>0?costCents/100/saleable:0;
  for(const x of input.outputs){
   await c.query("INSERT INTO coconut_production_day_outputs(production_id,product_id,quantity,unit_cost) VALUES($1,$2,$3,$4)",
    [created.rows[0].id,x.productId,x.quantity,unitCost]);
   await c.query("INSERT INTO inventory_balances(product_id,quantity) VALUES($1,$2) ON CONFLICT(product_id) DO UPDATE SET quantity=inventory_balances.quantity+$2,updated_at=now()",
    [x.productId,x.quantity]);
   await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'adjustment',$3,$4)",
    [x.productId,x.quantity,created.rows[0].id,actor]);
  }
  await c.query("UPDATE coconut_production_days SET raw_material_cost=$2 WHERE id=$1",[created.rows[0].id,costCents/100]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'go.production','production',$2)",
   [actor,created.rows[0].id]);
  return created.rows[0].id;
 });
}
export async function registerVoidReceipt(input:{number:string;reason:string},actor:string){
 const number=input.number.padStart(7,"0"),reason=input.reason.trim();
 if(!/^[0-9]{7}$/.test(number)||Number(number)<1||reason.length<5||reason.length>400)
  throw new BusinessError("Nomor dan alasan nota rusak tidak valid.");
 await transaction(async c=>{
  const used=await c.query("SELECT id FROM customer_orders WHERE document_number=$1",[number]);
  const shipped=await c.query("SELECT id FROM delivery_notes WHERE document_number=$1",[number]);
  if(used.rowCount||shipped.rowCount)throw new BusinessError("Nomor sudah dipakai pada transaksi, tidak boleh ditandai rusak.");
  await c.query("INSERT INTO receipt_register(document_number,status,note,actor_id) VALUES($1,'VOID',$2,$3)",[number,reason,actor]);
 });
}
export async function createCashEntry(input:{key:string;date:string;direction:"IN"|"OUT";category:string;amount:number;description:string},actor:string){
 if(!uuid(input.key)||!day(input.date)||!["IN","OUT"].includes(input.direction)||!price(input.amount)||input.amount===0||
 input.category.trim().length<2||input.category.length>80||input.description.trim().length<5||input.description.length>400)
  throw new BusinessError("Catatan kas tidak valid.");
 await query("INSERT INTO cash_ledger_entries(request_key,entry_date,direction,category,description,amount,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(request_key) DO NOTHING",
  [input.key,input.date,input.direction,input.category.trim().slice(0,80),input.description.trim().slice(0,400),input.amount,actor]);
}
export async function addInventoryAsset(input:{name:string;quantity:number;note:string},actor:string){
 if(input.name.trim().length<2||input.name.length>150||!count(input.quantity)||input.note.length>400)
  throw new BusinessError("Data inventaris tidak valid.");
 await query("INSERT INTO inventory_assets(name,quantity,note) VALUES($1,$2,$3)",[input.name.trim(),input.quantity,input.note.trim()]);
}
export async function moveInventoryAsset(input:{id:string;date:string;kind:string;quantity:number;outletId:string;note:string},actor:string){
 if(!uuid(input.id)||!day(input.date)||!["IN","OUT","RETURN","LOST","DAMAGED","ADJUST"].includes(input.kind)||
 !count(input.quantity)||input.quantity===0||(input.outletId!==""&&!uuid(input.outletId))||input.note.length>400)
  throw new BusinessError("Pergerakan inventaris tidak valid.");
 await transaction(async c=>{
  const asset=await c.query<{quantity:number}>("SELECT quantity FROM inventory_assets WHERE id=$1 FOR UPDATE",[input.id]);
  if(!asset.rows[0])throw new BusinessError("Inventaris tidak ditemukan.");
  const events=await c.query<{out_total:string;returned:string;lost:string;damaged:string}>(
   "SELECT COALESCE(SUM(quantity) FILTER(WHERE kind='OUT'),0)::text out_total,COALESCE(SUM(quantity) FILTER(WHERE kind='RETURN'),0)::text returned,COALESCE(SUM(quantity) FILTER(WHERE kind='LOST'),0)::text lost,COALESCE(SUM(quantity) FILTER(WHERE kind='DAMAGED'),0)::text damaged FROM inventory_asset_movements WHERE asset_id=$1",
   [input.id]);
  const pending=Number(events.rows[0].out_total)-Number(events.rows[0].returned);
  if(input.kind==="RETURN"&&input.quantity>pending)throw new BusinessError("Jumlah kembali melebihi yang dipinjam.");
  if(input.kind==="OUT"&&input.quantity>asset.rows[0].quantity-Number(events.rows[0].damaged)-pending)
   throw new BusinessError("Stok inventaris tersedia tidak mencukupi.");
  await c.query("INSERT INTO inventory_asset_movements(asset_id,movement_date,kind,quantity,outlet_id,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
   [input.id,input.date,input.kind,input.quantity,input.outletId||null,input.note.slice(0,400),actor]);
  if(input.kind==="IN")await c.query("UPDATE inventory_assets SET quantity=quantity+$2 WHERE id=$1",[input.id,input.quantity]);
  if(input.kind==="LOST")await c.query("UPDATE inventory_assets SET quantity=GREATEST(0,quantity-$2) WHERE id=$1",[input.id,input.quantity]);
 });
}
