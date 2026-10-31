import { query, transaction } from "@/lib/db";
import { BusinessError } from "@/lib/operations";

const integer=(n:number)=>Number.isSafeInteger(n)&&n>0&&n<=100000000;
const money=(n:number)=>Number.isFinite(n)&&n>=0&&n<=100000000000&&Number.isInteger(n*100);
const uid=(x:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const str=(value:string,max:number)=>value.trim().slice(0,max);
const key=(s:string)=>{if(!uid(s)) throw new BusinessError("Kode transaksi tidak valid.");return s;};

export async function listGrades(){
 return query<{id:string;code:string;name:string;thickness_min_mm:string|null;thickness_max_mm:string|null}>(
 "SELECT id::text,code,name,thickness_min_mm::text,thickness_max_mm::text FROM coconut_grades WHERE active=true ORDER BY name");
}
export async function listSupplierPrices(){
 return query<{id:string;supplier_name:string;grade_name:string;unit_price:string;effective_at:Date}>(
 "SELECT sp.id::text,s.name supplier_name,g.name grade_name,sp.unit_price::text,sp.effective_at FROM supplier_prices sp JOIN suppliers s ON s.id=sp.supplier_id JOIN coconut_grades g ON g.id=sp.grade_id ORDER BY sp.effective_at DESC LIMIT 60");
}
export async function createGrade(input:{code:string;name:string;min:number|null;max:number|null;notes:string}){
 if(!/^[A-Z0-9_-]{2,40}$/.test(input.code.toUpperCase())||input.name.trim().length<2)throw new BusinessError("Kode dan nama grade wajib diisi.");
 if((input.min!==null&&(!Number.isFinite(input.min)||input.min<0))||(input.max!==null&&(!Number.isFinite(input.max)||input.max<0))||(input.min!==null&&input.max!==null&&input.max<input.min))throw new BusinessError("Rentang ketebalan tidak valid.");
 await query("INSERT INTO coconut_grades(code,name,thickness_min_mm,thickness_max_mm,notes) VALUES($1,$2,$3,$4,$5)",
 [input.code.toUpperCase(),str(input.name,100),input.min,input.max,str(input.notes,500)]);
}
export async function addSupplierPrice(input:{supplierId:string;gradeId:string;price:number;note:string},actor:string){
 if(!uid(input.supplierId)||!uid(input.gradeId)||!money(input.price))throw new BusinessError("Supplier, grade atau harga tidak valid.");
 await query("INSERT INTO supplier_prices(supplier_id,grade_id,unit,unit_price,note,created_by) VALUES($1,$2,'BUTIR',$3,$4,$5)",
 [input.supplierId,input.gradeId,input.price,str(input.note,400),actor]);
}
export async function listCoconutReceipts(){
 return query<{id:string;batch_id:string;supplier:string;grade:string;quantity:number;price_per_butir:string;total_value:string;received_at:Date;accepted_qty:number;rejected_qty:number;consumed_qty:number}>(
 "SELECT r.id::text,b.id::text batch_id,s.name supplier,g.name grade,r.quantity,r.price_per_butir::text,r.total_value::text,r.received_at,b.accepted_qty,b.rejected_qty,b.consumed_qty FROM coconut_receipts r JOIN coconut_batches b ON b.receipt_id=r.id JOIN suppliers s ON s.id=r.supplier_id JOIN coconut_grades g ON g.id=r.grade_id ORDER BY r.received_at DESC LIMIT 80");
}
export async function receiveCoconut(data:{requestKey:string;supplierId:string;gradeId:string;quantity:number;price:number;note:string},actor:string){
 key(data.requestKey);
 if(!uid(data.supplierId)||!uid(data.gradeId)||!integer(data.quantity)||!money(data.price))throw new BusinessError("Jumlah, supplier, grade atau harga tidak valid.");
 return transaction(async c=>{
  const r=await c.query<{id:string}>(
   "INSERT INTO coconut_receipts(request_key,supplier_id,grade_id,quantity,price_per_butir,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(request_key) DO NOTHING RETURNING id",
   [data.requestKey,data.supplierId,data.gradeId,data.quantity,data.price,str(data.note,400),actor]);
  if(!r.rows[0]){
    const prior=await c.query<{id:string}>("SELECT id::text FROM coconut_receipts WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
    if(!prior.rows[0]) throw new BusinessError("Transaksi duplikat milik pengguna berbeda.");
    return prior.rows[0].id;
  }
  await c.query("INSERT INTO coconut_batches(receipt_id,received_qty) VALUES($1,$2)",[r.rows[0].id,data.quantity]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'coconut.receive','coconut_receipt',$2)",[actor,r.rows[0].id]);
  return r.rows[0].id;
 });
}
export async function recordQc(data:{requestKey:string;batchId:string;passed:number;rejected:number;reason:string},actor:string){
 key(data.requestKey);
 if(!uid(data.batchId)||!Number.isSafeInteger(data.passed)||data.passed<0||!Number.isSafeInteger(data.rejected)||data.rejected<0||data.passed+data.rejected<1||data.rejected>0&&data.reason.trim().length<5)throw new BusinessError("Jumlah QC atau alasan afkir tidak valid.");
 return transaction(async c=>{
   const old=await c.query<{id:string}>("SELECT id::text FROM coconut_qc WHERE request_key=$1 AND inspected_by=$2",[data.requestKey,actor]);
   if(old.rows[0])return old.rows[0].id;
   const batch=await c.query<{received_qty:number;accepted_qty:number;rejected_qty:number}>(
    "SELECT received_qty,accepted_qty,rejected_qty FROM coconut_batches WHERE id=$1 FOR UPDATE",[data.batchId]);
   if(!batch.rows[0])throw new BusinessError("Batch tidak ditemukan.");
   const remaining=batch.rows[0].received_qty-batch.rows[0].accepted_qty-batch.rows[0].rejected_qty;
   if(data.passed+data.rejected>remaining)throw new BusinessError("Jumlah QC melebihi sisa batch yang belum diperiksa.");
   const r=await c.query<{id:string}>(
    "INSERT INTO coconut_qc(request_key,batch_id,inspected_qty,passed_qty,rejected_qty,reject_reason,inspected_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
    [data.requestKey,data.batchId,data.passed+data.rejected,data.passed,data.rejected,str(data.reason,400),actor]);
   await c.query("UPDATE coconut_batches SET accepted_qty=accepted_qty+$2,rejected_qty=rejected_qty+$3 WHERE id=$1",[data.batchId,data.passed,data.rejected]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'coconut.qc','coconut_qc',$2)",[actor,r.rows[0].id]);
   return r.rows[0].id;
 });
}
export async function listProduction(){
 return query<{id:string;production_date:string;supplier:string;product:string;coconut_used:number;peeled_qty:number;produced_qty:number}>(
 "SELECT pr.id::text,pr.production_date::text,s.name supplier,p.name product,pr.coconut_used,pr.peeled_qty,o.produced_qty FROM coconut_production pr JOIN coconut_batches b ON b.id=pr.batch_id JOIN coconut_receipts r ON r.id=b.receipt_id JOIN suppliers s ON s.id=r.supplier_id JOIN coconut_production_outputs o ON o.production_id=pr.id JOIN products p ON p.id=o.product_id ORDER BY pr.created_at DESC LIMIT 70");
}

export async function recordProduction(data:{requestKey:string;batchId:string;used:number;peeled:number;outputs:{productId:string;quantity:number}[];note:string;date:string},actor:string){
 key(data.requestKey);
 if(!uid(data.batchId)||!integer(data.used)||!Number.isInteger(data.peeled)||data.peeled<0||data.peeled>data.used||
  !/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Array.isArray(data.outputs)||data.outputs.length<1||data.outputs.length>20||
  data.outputs.some(o=>!uid(o.productId)||!integer(o.quantity))||
  new Set(data.outputs.map(o=>o.productId)).size!==data.outputs.length)
  throw new BusinessError("Data pengupasan atau hasil produksi tidak valid.");
 return transaction(async c=>{
   const prior=await c.query<{id:string}>("SELECT id::text FROM coconut_production WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
   if(prior.rows[0])return prior.rows[0].id;
   const batch=await c.query<{available:number}>("SELECT accepted_qty-consumed_qty available FROM coconut_batches WHERE id=$1 FOR UPDATE",[data.batchId]);
   if(!batch.rows[0]||batch.rows[0].available<data.used)throw new BusinessError("Stok bahan baku lolos QC tidak mencukupi.");
   const productIds=data.outputs.map(o=>o.productId).sort();
   const products=await c.query<{id:string}>("SELECT id::text FROM products WHERE id=ANY($1::uuid[]) AND active=true ORDER BY id",[productIds]);
   if(products.rowCount!==data.outputs.length)throw new BusinessError("Ada produk hasil yang tidak aktif.");
   const r=await c.query<{id:string}>(
    "INSERT INTO coconut_production(request_key,batch_id,coconut_used,peeled_qty,production_date,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
    [data.requestKey,data.batchId,data.used,data.peeled,data.date,str(data.note,400),actor]);
   await c.query("UPDATE coconut_batches SET consumed_qty=consumed_qty+$2 WHERE id=$1",[data.batchId,data.used]);
   for(const productId of productIds){
     const output=data.outputs.find(o=>o.productId===productId)!;
     await c.query("INSERT INTO coconut_production_outputs(production_id,product_id,produced_qty) VALUES($1,$2,$3)",[r.rows[0].id,productId,output.quantity]);
     const updated=await c.query("UPDATE inventory_balances SET quantity=quantity+$2,updated_at=now() WHERE product_id=$1",[productId,output.quantity]);
     if(!updated.rowCount)throw new BusinessError("Saldo stok produk belum terdaftar.");
     // Preserve V1 ledger source types, with production ID as source for audit.
     await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'adjustment',$3,$4)",
       [productId,output.quantity,r.rows[0].id,actor]);
   }
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'coconut.production','production',$2)",[actor,r.rows[0].id]);
   return r.rows[0].id;
 });
}

export async function listVisits(){
 return query<{id:string;visited_on:string;outlet:string;staff_name:string;outcome:string;note:string;follow_up_on:string|null}>(
  "SELECT v.id::text,v.visited_on::text,o.name outlet,v.staff_name,v.outcome,v.note,v.follow_up_on::text FROM marketing_visits v JOIN outlets o ON o.id=v.outlet_id ORDER BY v.visited_on DESC,v.created_at DESC LIMIT 80");
}
export async function recordVisit(data:{requestKey:string;outletId:string;date:string;staff:string;outcome:string;note:string;followUp:string},actor:string){
 key(data.requestKey);
 if(!uid(data.outletId)||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||data.staff.trim().length<2||
 !["prospek","order","follow_up","komplain","kunjungan"].includes(data.outcome)||
 (data.followUp&&!/^\d{4}-\d{2}-\d{2}$/.test(data.followUp)))throw new BusinessError("Data kunjungan tidak valid.");
 const r=await query<{id:string}>(
 "INSERT INTO marketing_visits(request_key,outlet_id,visited_on,staff_name,outcome,note,follow_up_on,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(request_key) DO NOTHING RETURNING id",
 [data.requestKey,data.outletId,data.date,str(data.staff,120),data.outcome,str(data.note,1000),data.followUp||null,actor]);
 return r[0]?.id||null;
}
