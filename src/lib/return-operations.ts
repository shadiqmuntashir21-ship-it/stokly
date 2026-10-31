import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
const uuid=(x:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const qty=(n:number)=>Number.isSafeInteger(n)&&n>0&&n<=100000000;
export async function listReturnLines(){
 return query<{delivery_id:string;order_item_id:string;number:string;outlet:string;product:string;quantity:number;returned:number;price:string}>(
 `SELECT d.id::text delivery_id,li.order_item_id::text,d.document_number number,o.name outlet,p.name product,li.quantity,
 COALESCE((SELECT SUM(r.quantity)::int FROM delivery_returns r WHERE r.delivery_id=d.id AND r.order_item_id=li.order_item_id),0)::int returned,
 li.unit_price::text price
 FROM delivery_notes d JOIN delivery_note_items li ON li.delivery_id=d.id
 JOIN customer_order_items oi ON oi.id=li.order_item_id
 JOIN products p ON p.id=oi.product_id
 JOIN customer_orders co ON co.id=d.order_id JOIN outlets o ON o.id=co.outlet_id
 JOIN delivery_invoices inv ON inv.delivery_id=d.id
 WHERE inv.status='issued' ORDER BY d.created_at DESC LIMIT 120`);
}
export async function listV2Returns(){
 return query<{id:string;document_number:string;outlet:string;product:string;quantity:number;credit_amount:string;restock:boolean;qc_result:string;reason:string;created_at:Date}>(
 `SELECT r.id::text,d.document_number,o.name outlet,p.name product,r.quantity,r.credit_amount::text,r.restock,r.qc_result,r.reason,r.created_at
 FROM delivery_returns r JOIN delivery_notes d ON d.id=r.delivery_id JOIN customer_orders co ON co.id=d.order_id
 JOIN outlets o ON o.id=co.outlet_id JOIN customer_order_items i ON i.id=r.order_item_id JOIN products p ON p.id=i.product_id
 ORDER BY r.created_at DESC LIMIT 80`);
}
export async function createV2Return(data:{requestKey:string;deliveryId:string;orderItemId:string;quantity:number;restock:boolean;qc:string;reason:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.deliveryId)||!uuid(data.orderItemId)||!qty(data.quantity)||
 !["pending","passed","rejected","not_applicable"].includes(data.qc)||data.reason.trim().length<5||
 (data.restock&&data.qc!=="passed"))throw new BusinessError("Data retur atau keputusan QC tidak valid.");
 return transaction(async c=>{
  const previous=await c.query<{id:string}>("SELECT id::text FROM delivery_returns WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
  if(previous.rows[0])return previous.rows[0].id;
  const invoice=await c.query<{id:string;gross:string;status:string}>(
   "SELECT id::text,gross::text,status FROM delivery_invoices WHERE delivery_id=$1 FOR UPDATE",[data.deliveryId]);
  if(!invoice.rows[0]||invoice.rows[0].status!=="issued")throw new BusinessError("Nota tidak ditemukan atau batal.");
  const line=await c.query<{product_id:string;quantity:number;unit_price:string}>(
   `SELECT i.product_id::text,di.quantity,di.unit_price::text
    FROM delivery_note_items di JOIN customer_order_items i ON i.id=di.order_item_id
    WHERE di.delivery_id=$1 AND di.order_item_id=$2`,[data.deliveryId,data.orderItemId]);
  if(!line.rows[0])throw new BusinessError("Produk tidak tercatat pada nota ini.");
  const prior=await c.query<{quantity:number;credits:string}>(
   "SELECT COALESCE(SUM(quantity),0)::int quantity,COALESCE(SUM(credit_amount),0)::text credits FROM delivery_returns WHERE delivery_id=$1 AND order_item_id=$2",
   [data.deliveryId,data.orderItemId]);
  if((prior.rows[0]?.quantity||0)+data.quantity>line.rows[0].quantity)throw new BusinessError("Jumlah retur melebihi barang yang dikirim.");
  const totals=await c.query<{credits:string;paid:string}>(
   `SELECT (SELECT COALESCE(SUM(credit_amount),0)::text FROM delivery_returns WHERE delivery_id=$1) credits,
    (SELECT COALESCE(SUM(p.amount),0)::text FROM delivery_payments p WHERE p.invoice_id=$2) paid`,
    [data.deliveryId,invoice.rows[0].id]);
  const creditCents=Math.round(Number(line.rows[0].unit_price)*100)*data.quantity;
  const nextNet=Math.round(Number(invoice.rows[0].gross)*100)-Math.round(Number(totals.rows[0].credits)*100)-creditCents;
  if(nextNet<Math.round(Number(totals.rows[0].paid)*100))
   throw new BusinessError("Retur melebihi sisa tagihan. Proses pengembalian dana perlu diselesaikan terlebih dahulu.");
  const r=await c.query<{id:string}>(
   `INSERT INTO delivery_returns(request_key,delivery_id,order_item_id,quantity,credit_amount,restock,reason,qc_result,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
   [data.requestKey,data.deliveryId,data.orderItemId,data.quantity,creditCents/100,data.restock,data.reason.trim().slice(0,400),data.qc,actor]);
  if(data.restock){
    const balance=await c.query("UPDATE inventory_balances SET quantity=quantity+$2,updated_at=now() WHERE product_id=$1",
      [line.rows[0].product_id,data.quantity]);
    if(!balance.rowCount)throw new BusinessError("Saldo stok produk tidak ditemukan.");
    await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'return',$3,$4)",
      [line.rows[0].product_id,data.quantity,r.rows[0].id,actor]);
  }
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'delivery.return','delivery_return',$2)",[actor,r.rows[0].id]);
  return r.rows[0].id;
 });
}
export async function listComplaints(){
 return query<{id:string;outlet:string;number:string|null;category:string;description:string;status:string;resolution:string;created_at:Date}>(
 `SELECT c.id::text,o.name outlet,d.document_number number,c.category,c.description,c.status,c.resolution,c.created_at
 FROM outlet_complaints c JOIN outlets o ON o.id=c.outlet_id LEFT JOIN delivery_notes d ON d.id=c.delivery_id
 ORDER BY c.created_at DESC LIMIT 80`);
}
export async function reportComplaint(data:{requestKey:string;outletId:string;deliveryId:string;category:string;description:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.outletId)||data.deliveryId&&!uuid(data.deliveryId)||
 !["quality","quantity","delivery","price","other"].includes(data.category)||data.description.trim().length<5)
 throw new BusinessError("Data komplain belum lengkap.");
 return transaction(async c=>{
  const old=await c.query<{id:string}>("SELECT id::text FROM outlet_complaints WHERE request_key=$1 AND opened_by=$2",[data.requestKey,actor]);
  if(old.rows[0])return old.rows[0].id;
  if(data.deliveryId){
   const matched=await c.query("SELECT 1 FROM delivery_notes d JOIN customer_orders o ON o.id=d.order_id WHERE d.id=$1 AND o.outlet_id=$2",[data.deliveryId,data.outletId]);
   if(!matched.rowCount)throw new BusinessError("Nota tidak sesuai dengan outlet.");
  }
  const r=await c.query<{id:string}>(
   "INSERT INTO outlet_complaints(request_key,outlet_id,delivery_id,category,description,opened_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
   [data.requestKey,data.outletId,data.deliveryId||null,data.category,data.description.trim().slice(0,1000),actor]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'complaint.create','complaint',$2)",[actor,r.rows[0].id]);
  return r.rows[0].id;
 });
}
export async function resolveComplaint(id:string,status:string,resolution:string,actor:string){
 if(!uuid(id)||!["resolved","rejected","investigating"].includes(status)||resolution.trim().length<5)throw new BusinessError("Keputusan komplain tidak valid.");
 await transaction(async c=>{
  const r=await c.query("UPDATE outlet_complaints SET status=$2,resolution=$3,resolved_at=CASE WHEN $2='investigating' THEN NULL ELSE now() END WHERE id=$1 AND status IN ('open','investigating') RETURNING id",
  [id,status,resolution.trim().slice(0,1000)]);
  if(!r.rowCount)throw new BusinessError("Komplain sudah ditutup atau tidak ditemukan.");
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'complaint.resolve','complaint',$2)",[actor,id]);
 });
}
