import { query, transaction } from "@/lib/db";
import { BusinessError } from "@/lib/operations";
type Item = {productId:string;quantity:number};
const uuid=(x:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const positive=(n:number)=>Number.isSafeInteger(n)&&n>0&&n<=100000000;
const date=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x);
const cents=(price:string)=>Math.round(Number(price)*100);

export async function listOrders(){
 return query<{id:string;outlet:string;ordered_on:string;status:string;items:number;total:string;shipped:number}>(
 `SELECT o.id::text,t.name outlet,o.ordered_on::text,o.status,
 COALESCE(SUM(i.quantity),0)::int items,
 COALESCE(SUM(i.quantity*i.unit_price),0)::text total,
 COALESCE((SELECT SUM(di.quantity)::int FROM delivery_notes dn JOIN delivery_note_items di ON di.delivery_id=dn.id WHERE dn.order_id=o.id),0)::int shipped
 FROM customer_orders o JOIN outlets t ON t.id=o.outlet_id
 JOIN customer_order_items i ON i.order_id=o.id
 GROUP BY o.id,t.name ORDER BY o.created_at DESC LIMIT 80`);
}
export async function listOrderLines(){
 return query<{id:string;order_id:string;outlet:string;product:string;quantity:number;unit_price:string;shipped:number}>(
 `SELECT i.id::text,i.order_id::text,t.name outlet,p.name product,i.quantity,i.unit_price::text,
 COALESCE((SELECT SUM(di.quantity)::int FROM delivery_note_items di WHERE di.order_item_id=i.id),0)::int shipped
 FROM customer_order_items i JOIN customer_orders o ON o.id=i.order_id
 JOIN outlets t ON t.id=o.outlet_id JOIN products p ON p.id=i.product_id
 WHERE o.status!='cancelled' ORDER BY o.created_at DESC LIMIT 120`);
}
export async function createOrder(data:{requestKey:string;outletId:string;items:Item[];deliveryDate:string;note:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.outletId)||!Array.isArray(data.items)||data.items.length<1||data.items.length>30||
 data.items.some(x=>!uuid(x.productId)||!positive(x.quantity))||
 new Set(data.items.map(x=>x.productId)).size!==data.items.length||
 (data.deliveryDate&&!date(data.deliveryDate)))throw new BusinessError("Data order tidak valid.");
 return transaction(async c=>{
  const prior=await c.query<{id:string}>("SELECT id::text FROM customer_orders WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
  if(prior.rows[0])return prior.rows[0].id;
  const outlet=await c.query("SELECT id FROM outlets WHERE id=$1 AND active=true",[data.outletId]);
  if(!outlet.rowCount)throw new BusinessError("Outlet tidak tersedia.");
  const products=await c.query<{id:string;price:string}>("SELECT id::text,price::text FROM products WHERE id=ANY($1::uuid[]) AND active=true",[data.items.map(x=>x.productId)]);
  if(products.rowCount!==data.items.length)throw new BusinessError("Salah satu produk tidak aktif.");
  const r=await c.query<{id:string}>(
   "INSERT INTO customer_orders(request_key,outlet_id,desired_delivery,note,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
   [data.requestKey,data.outletId,data.deliveryDate||null,data.note.trim().slice(0,400),actor]);
  for(const item of data.items){
   const product=products.rows.find(x=>x.id===item.productId)!;
   if(!Number.isSafeInteger(cents(product.price)))throw new BusinessError("Harga produk tidak valid.");
   await c.query("INSERT INTO customer_order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)",
    [r.rows[0].id,item.productId,item.quantity,product.price]);
  }
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'order.create','customer_order',$2)",[actor,r.rows[0].id]);
  return r.rows[0].id;
 });
}
export async function dispatch(data:{requestKey:string;orderItemId:string;quantity:number;deliveredOn:string;note:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.orderItemId)||!positive(data.quantity)||!date(data.deliveredOn))throw new BusinessError("Pengiriman tidak valid.");
 return transaction(async c=>{
  const prev=await c.query<{id:string}>("SELECT id::text FROM delivery_notes WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
  if(prev.rows[0])return prev.rows[0].id;
  const line=await c.query<{order_id:string;product_id:string;quantity:number;unit_price:string;status:string}>(
   `SELECT o.id::text order_id,i.product_id::text,i.quantity,i.unit_price::text,o.status FROM customer_order_items i
     JOIN customer_orders o ON o.id=i.order_id WHERE i.id=$1`,[data.orderItemId]);
  if(!line.rows[0])throw new BusinessError("Item order tidak ditemukan.");
  const x=line.rows[0];
  const lock=await c.query<{status:string}>("SELECT status FROM customer_orders WHERE id=$1 FOR UPDATE",[x.order_id]);
  if(!lock.rows[0]||lock.rows[0].status==='cancelled')throw new BusinessError("Order dibatalkan.");
  const shipped=await c.query<{shipped:number}>(
    "SELECT COALESCE(SUM(quantity),0)::int shipped FROM delivery_note_items WHERE order_item_id=$1",[data.orderItemId]);
  if(x.quantity-(shipped.rows[0]?.shipped||0)<data.quantity)throw new BusinessError("Jumlah pengiriman melebihi sisa order.");
  const bal=await c.query<{quantity:number}>("SELECT quantity FROM inventory_balances WHERE product_id=$1 FOR UPDATE",[x.product_id]);
  if(!bal.rows[0]||bal.rows[0].quantity<data.quantity)throw new BusinessError("Stok produk tidak mencukupi untuk pengiriman.");
  const r=await c.query<{id:string}>(
    "INSERT INTO delivery_notes(request_key,order_id,delivered_on,note,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
    [data.requestKey,x.order_id,data.deliveredOn,data.note.trim().slice(0,400),actor]);
  await c.query("INSERT INTO delivery_note_items(delivery_id,order_item_id,quantity,unit_price) VALUES($1,$2,$3,$4)",
   [r.rows[0].id,data.orderItemId,data.quantity,x.unit_price]);
  await c.query("UPDATE inventory_balances SET quantity=quantity-$2,updated_at=now() WHERE product_id=$1",[x.product_id,data.quantity]);
  // Source 'sale' is preserved by the V1 ledger constraint; source_id links to delivery_notes.
  await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'sale',$3,$4)",
   [x.product_id,-data.quantity,r.rows[0].id,actor]);
  await c.query("INSERT INTO delivery_invoices(delivery_id,gross) VALUES($1,$2)",[r.rows[0].id,(cents(x.unit_price)*data.quantity)/100]);
  const pending=await c.query<{count:number}>(
    `SELECT COUNT(*)::int count FROM customer_order_items i WHERE i.order_id=$1 AND i.quantity>
      COALESCE((SELECT SUM(d.quantity)::int FROM delivery_note_items d WHERE d.order_item_id=i.id),0)`,[x.order_id]);
  await c.query("UPDATE customer_orders SET status=$2 WHERE id=$1",[x.order_id,pending.rows[0].count===0?'delivered':'partially_delivered']);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'delivery.create','delivery',$2)",[actor,r.rows[0].id]);
  return r.rows[0].id;
 });
}
export async function listInvoices(){
 return query<{id:string;document_number:string;outlet:string;delivered_on:string;gross:string;paid:string;credit:string;status:string}>(
 `SELECT inv.id::text,d.document_number,t.name outlet,d.delivered_on::text,inv.gross::text,
 COALESCE((SELECT SUM(p.amount) FROM delivery_payments p WHERE p.invoice_id=inv.id),0)::text paid,
 COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0)::text credit,inv.status
 FROM delivery_invoices inv JOIN delivery_notes d ON d.id=inv.delivery_id JOIN customer_orders o ON o.id=d.order_id
 JOIN outlets t ON t.id=o.outlet_id ORDER BY d.created_at DESC LIMIT 80`);
}
export async function payInvoice(data:{requestKey:string;invoiceId:string;amount:number;method:string;reference:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.invoiceId)||!Number.isFinite(data.amount)||data.amount<=0||data.amount>1e12||
 !Number.isSafeInteger(Math.round(data.amount*100))||!['cash','transfer','other'].includes(data.method))
 throw new BusinessError("Nominal pembayaran atau metode tidak valid.");
 return transaction(async c=>{
   const prior=await c.query<{id:string}>("SELECT id::text FROM delivery_payments WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
   if(prior.rows[0])return prior.rows[0].id;
   const inv=await c.query<{gross:string;status:string}>("SELECT gross::text,status FROM delivery_invoices WHERE id=$1 FOR UPDATE",[data.invoiceId]);
   if(!inv.rows[0]||inv.rows[0].status!=='issued')throw new BusinessError("Tagihan tidak tersedia.");
   const totals=await c.query<{paid:string;credits:string}>(
   `SELECT (SELECT COALESCE(SUM(amount),0)::text FROM delivery_payments WHERE invoice_id=$1) paid,
    (SELECT COALESCE(SUM(r.credit_amount),0)::text FROM delivery_returns r JOIN delivery_notes d ON d.id=r.delivery_id JOIN delivery_invoices i ON i.delivery_id=d.id WHERE i.id=$1) credits`,
    [data.invoiceId]);
   const remaining=Math.round(Number(inv.rows[0].gross)*100)-Math.round(Number(totals.rows[0].credits)*100)-Math.round(Number(totals.rows[0].paid)*100);
   const amountCents=Math.round(data.amount*100);
   if(amountCents<=0||amountCents>remaining)throw new BusinessError("Pembayaran melebihi sisa tagihan.");
   const r=await c.query<{id:string}>(
    "INSERT INTO delivery_payments(request_key,invoice_id,amount,payment_method,payment_reference,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [data.requestKey,data.invoiceId,amountCents/100,data.method,data.reference.trim().slice(0,120),actor]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'invoice.payment','invoice',$2)",[actor,data.invoiceId]);
   return r.rows[0].id;
 });
}
