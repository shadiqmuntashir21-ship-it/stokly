import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";

const uuid=(x:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const positive=(n:number)=>Number.isSafeInteger(n)&&n>0&&n<=100000000;
const validDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d);
const cents=(n:number)=>Math.round(n*100);
const validPrice=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1e12&&Number.isSafeInteger(cents(n));

type OrderItem={productId:string;quantity:number;unitPrice:number|null};
type DispatchItem={orderItemId:string;quantity:number};

export async function receiptNumberReady(){
 const rows=await query<{ready:boolean}>("SELECT EXISTS(SELECT 1 FROM receipt_number_settings WHERE singleton=true AND next_number BETWEEN 1 AND 9999999) AS ready");
 return !!rows[0]?.ready;
}

export async function listOrders(){
 return query<{id:string;document_number:string|null;outlet:string;ordered_on:string;status:string;items:number;total:string;shipped:number}>(
 "SELECT o.id::text,o.document_number,t.name AS outlet,o.ordered_on::text,o.status,COALESCE(SUM(i.quantity),0)::int AS items,COALESCE(SUM(i.quantity*i.unit_price),0)::text AS total,COALESCE((SELECT SUM(di.quantity)::int FROM delivery_notes dn JOIN delivery_note_items di ON di.delivery_id=dn.id WHERE dn.order_id=o.id),0)::int AS shipped FROM customer_orders o JOIN outlets t ON t.id=o.outlet_id JOIN customer_order_items i ON i.order_id=o.id GROUP BY o.id,t.name ORDER BY o.created_at DESC LIMIT 100"
 );
}
export async function listOrderLines(){
 return query<{id:string;order_id:string;number:string|null;outlet:string;product:string;quantity:number;unit_price:string;shipped:number}>(
 "SELECT i.id::text,i.order_id::text,o.document_number AS number,t.name AS outlet,p.name AS product,i.quantity,i.unit_price::text,COALESCE((SELECT SUM(di.quantity)::int FROM delivery_note_items di WHERE di.order_item_id=i.id),0)::int AS shipped FROM customer_order_items i JOIN customer_orders o ON o.id=i.order_id JOIN outlets t ON t.id=o.outlet_id JOIN products p ON p.id=i.product_id WHERE o.status!='cancelled' ORDER BY o.created_at DESC,p.name LIMIT 250"
 );
}
export async function createOrder(data:{requestKey:string;outletId:string;items:OrderItem[];deliveryDate:string;note:string;priceReason:string},actor:string,allowOverride:boolean){
 if(!uuid(data.requestKey)||!uuid(data.outletId)||!Array.isArray(data.items)||data.items.length<1||data.items.length>30||
 data.items.some(i=>!uuid(i.productId)||!positive(i.quantity)||(i.unitPrice!==null&&!validPrice(i.unitPrice)))||
 new Set(data.items.map(i=>i.productId)).size!==data.items.length||(data.deliveryDate&&!validDate(data.deliveryDate)))
 throw new BusinessError("Data order tidak valid.");
 return transaction(async c=>{
  const prior=await c.query<{id:string}>("SELECT id::text FROM customer_orders WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
  if(prior.rows[0])return prior.rows[0].id;
  const outlet=await c.query("SELECT id FROM outlets WHERE id=$1 AND active=true",[data.outletId]);
  if(!outlet.rowCount)throw new BusinessError("Outlet tidak aktif.");
  const products=await c.query<{id:string;price:string}>("SELECT id::text,price::text FROM products WHERE id=ANY($1::uuid[]) AND active=true",[data.items.map(i=>i.productId)]);
  if(products.rowCount!==data.items.length)throw new BusinessError("Ada produk tidak aktif.");
  const priced=data.items.map(i=>{
   const master=Number(products.rows.find(p=>p.id===i.productId)!.price);
   const price=i.unitPrice===null?master:i.unitPrice;
   if(!validPrice(master)||!validPrice(price))throw new BusinessError("Harga produk tidak valid.");
   const changed=cents(master)!==cents(price);
   if(changed&&!allowOverride)throw new BusinessError("Hanya Owner/Admin boleh mengubah harga transaksi.");
   if(changed&&data.priceReason.trim().length<5)throw new BusinessError("Tulis alasan perubahan harga transaksi (minimal 5 karakter).");
   return {...i,price,master,changed};
  });
  const order=await c.query<{id:string;document_number:string|null}>("INSERT INTO customer_orders(request_key,outlet_id,desired_delivery,note,created_by,receipt_number_pending,ordered_on,document_number) VALUES($1,$2,$3,$4,$5,true,(now() AT TIME ZONE 'Asia/Makassar')::date,NULL) RETURNING id::text,document_number",[data.requestKey,data.outletId,data.deliveryDate||null,data.note.trim().slice(0,400),actor]);
  if(order.rows[0].document_number)await c.query("UPDATE customer_orders SET receipt_number_pending=false WHERE id=$1",[order.rows[0].id]);
  for(const item of priced){
   const added=await c.query<{id:string}>("INSERT INTO customer_order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4) RETURNING id::text",[order.rows[0].id,item.productId,item.quantity,item.price]);
   if(item.changed)await c.query("INSERT INTO order_price_overrides(order_item_id,standard_price,applied_price,reason,created_by) VALUES($1,$2,$3,$4,$5)",[added.rows[0].id,item.master,item.price,data.priceReason.trim().slice(0,400),actor]);
  }
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'order.create','customer_order',$2)",[actor,order.rows[0].id]);
  return order.rows[0].id;
 });
}

export async function dispatchOrder(data:{requestKey:string;orderId:string;items:DispatchItem[];deliveredOn:string;note:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.orderId)||!validDate(data.deliveredOn)||!Array.isArray(data.items)||
 data.items.length<1||data.items.length>50||data.items.some(i=>!uuid(i.orderItemId)||!positive(i.quantity))||
 new Set(data.items.map(i=>i.orderItemId)).size!==data.items.length)
 throw new BusinessError("Pilih order dan jumlah produk yang akan dikirim.");
 return transaction(async c=>{
  const previous=await c.query<{id:string}>("SELECT id::text FROM delivery_notes WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
  if(previous.rows[0])return previous.rows[0].id;
  const order=await c.query<{status:string;document_number:string|null;receipt_number_pending:boolean}>("SELECT status,document_number,receipt_number_pending FROM customer_orders WHERE id=$1 FOR UPDATE",[data.orderId]);
  if(!order.rows[0]||order.rows[0].status==='cancelled')throw new BusinessError("Order tidak ditemukan atau dibatalkan.");
  const ids=data.items.map(i=>i.orderItemId);
  const lines=await c.query<{id:string;product_id:string;quantity:number;unit_price:string;shipped:number}>(
   "SELECT i.id::text,i.product_id::text,i.quantity,i.unit_price::text,COALESCE((SELECT SUM(x.quantity)::int FROM delivery_note_items x WHERE x.order_item_id=i.id),0)::int AS shipped FROM customer_order_items i WHERE i.order_id=$1 AND i.id=ANY($2::uuid[]) FOR UPDATE",
   [data.orderId,ids]);
  if(lines.rowCount!==data.items.length)throw new BusinessError("Item tidak termasuk dalam order.");
  const required=new Map<string,number>();
  let total=0;
  for(const item of data.items){
   const line=lines.rows.find(l=>l.id===item.orderItemId)!;
   if(item.quantity>line.quantity-line.shipped)throw new BusinessError("Jumlah dikirim melebihi sisa order.");
   required.set(line.product_id,(required.get(line.product_id)||0)+item.quantity);
   total+=cents(Number(line.unit_price))*item.quantity;
  }
  if(!Number.isSafeInteger(total)||total<0)throw new BusinessError("Nilai pengiriman tidak valid.");
  const productIds=Array.from(required.keys()).sort();
  const balances=await c.query<{product_id:string;quantity:number}>("SELECT product_id::text,quantity FROM inventory_balances WHERE product_id=ANY($1::uuid[]) ORDER BY product_id FOR UPDATE",[productIds]);
  if(balances.rowCount!==productIds.length||balances.rows.some(x=>x.quantity<(required.get(x.product_id)||0)))
   throw new BusinessError("Stok tidak mencukupi untuk seluruh item pengiriman.");
  const receiptNumber=(await c.query<{number:string|null}>("SELECT allocate_stokly_receipt_number() AS number")).rows[0]?.number;
  if(!receiptNumber)throw new BusinessError("Nomor kuitansi habis atau belum aktif.");
  const delivery=await c.query<{id:string}>("INSERT INTO delivery_notes(request_key,order_id,delivered_on,note,created_by,document_number) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text",
   [data.requestKey,data.orderId,data.deliveredOn,data.note.trim().slice(0,400),actor,receiptNumber]);
  await c.query("INSERT INTO receipt_register(document_number,status,delivery_id,actor_id,note) VALUES($1,'ISSUED',$2,$3,'Terbit otomatis pada saat pengiriman')",
   [receiptNumber,delivery.rows[0].id,actor]);
  if(!order.rows[0].document_number){
   await c.query("UPDATE customer_orders SET document_number=$2,receipt_number_pending=false WHERE id=$1 AND document_number IS NULL",
    [data.orderId,receiptNumber]);
  }
  for(const item of data.items){
   const line=lines.rows.find(l=>l.id===item.orderItemId)!;
   await c.query("INSERT INTO delivery_note_items(delivery_id,order_item_id,quantity,unit_price) VALUES($1,$2,$3,$4)",[delivery.rows[0].id,line.id,item.quantity,line.unit_price]);
  }
  for(const productId of productIds){
   const qty=required.get(productId)!;
   await c.query("UPDATE inventory_balances SET quantity=quantity-$2,updated_at=now() WHERE product_id=$1",[productId,qty]);
   await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'sale',$3,$4)",[productId,-qty,delivery.rows[0].id,actor]);
  }
  await c.query("INSERT INTO delivery_invoices(delivery_id,gross) VALUES($1,$2)",[delivery.rows[0].id,total/100]);
  const pending=await c.query<{count:number}>("SELECT COUNT(*)::int AS count FROM customer_order_items i WHERE i.order_id=$1 AND i.quantity>COALESCE((SELECT SUM(d.quantity)::int FROM delivery_note_items d WHERE d.order_item_id=i.id),0)",[data.orderId]);
  await c.query("UPDATE customer_orders SET status=$2 WHERE id=$1",[data.orderId,pending.rows[0].count===0?'delivered':'partially_delivered']);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'delivery.create','delivery',$2)",[actor,delivery.rows[0].id]);
  return delivery.rows[0].id;
 });
}

export type ReceiptRow={id:string;document_number:string|null;outlet:string;group_name:string;ordered_on:string;status:string;ordered_pcs:number;pcs:number;ordered_total:string;gross:string;credit:string;paid:string;payment_method:string|null;paid_at:string|null;physical_receipt_type:string;physical_receipt_status:string;deliveries:number};
export async function listInvoices(options:{orderId?:string;limit?:number;offset?:number;search?:string}={}){
 const id=options.orderId&&uuid(options.orderId)?options.orderId:null;
 const search=(options.search||"").trim().slice(0,120)||null;
 const limit=Math.max(1,Math.min(500,options.limit??100));
 const offset=Math.max(0,Math.min(10000000,options.offset??0));
 return query<ReceiptRow>(
  "SELECT o.id::text,o.document_number,t.name AS outlet,COALESCE(g.name,'—') AS group_name,o.ordered_on::text,o.status,o.physical_receipt_type,o.physical_receipt_status,COALESCE((SELECT SUM(i.quantity)::int FROM customer_order_items i WHERE i.order_id=o.id),0)::int AS ordered_pcs,COALESCE((SELECT SUM(di.quantity)::int FROM delivery_notes d JOIN delivery_note_items di ON di.delivery_id=d.id WHERE d.order_id=o.id),0)::int AS pcs,COALESCE((SELECT SUM(i.quantity*i.unit_price) FROM customer_order_items i WHERE i.order_id=o.id),0)::text AS ordered_total,COALESCE((SELECT SUM(inv.gross) FROM delivery_notes d JOIN delivery_invoices inv ON inv.delivery_id=d.id WHERE d.order_id=o.id AND inv.status='issued'),0)::text AS gross,COALESCE((SELECT SUM(r.credit_amount) FROM delivery_notes d JOIN delivery_returns r ON r.delivery_id=d.id JOIN delivery_invoices inv ON inv.delivery_id=d.id WHERE d.order_id=o.id AND inv.status='issued'),0)::text AS credit,COALESCE((SELECT SUM(p.amount) FROM delivery_notes d JOIN delivery_invoices inv ON inv.delivery_id=d.id JOIN delivery_payments p ON p.invoice_id=inv.id WHERE d.order_id=o.id AND inv.status='issued'),0)::text AS paid,(SELECT p.payment_method FROM delivery_notes d JOIN delivery_invoices inv ON inv.delivery_id=d.id JOIN delivery_payments p ON p.invoice_id=inv.id WHERE d.order_id=o.id ORDER BY p.paid_at DESC LIMIT 1) AS payment_method,(SELECT (p.paid_at AT TIME ZONE 'Asia/Makassar')::date::text FROM delivery_notes d JOIN delivery_invoices inv ON inv.delivery_id=d.id JOIN delivery_payments p ON p.invoice_id=inv.id WHERE d.order_id=o.id ORDER BY p.paid_at DESC LIMIT 1) AS paid_at,(SELECT COUNT(*)::int FROM delivery_notes d WHERE d.order_id=o.id) AS deliveries FROM customer_orders o JOIN outlets t ON t.id=o.outlet_id LEFT JOIN outlet_groups g ON g.id=t.group_id WHERE ($1::uuid IS NULL OR o.id=$1::uuid) AND ($2::text IS NULL OR t.name ILIKE '%'||$2||'%' OR o.document_number ILIKE '%'||$2||'%') ORDER BY o.created_at DESC LIMIT $3 OFFSET $4",
  [id,search,limit,offset]
 );
}

export async function payOrder(data:{requestKey:string;orderId:string;amount:number;method:string;reference:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.orderId)||!validPrice(data.amount)||data.amount<=0||!['cash','transfer','other'].includes(data.method))
  throw new BusinessError("Pembayaran atau metode tidak valid.");
 return transaction(async c=>{
  const old=await c.query<{id:string}>("SELECT id::text FROM payment_batches WHERE request_key=$1 AND created_by=$2",[data.requestKey,actor]);
  if(old.rows[0])return old.rows[0].id;
  const order=await c.query("SELECT id FROM customer_orders WHERE id=$1 FOR UPDATE",[data.orderId]);
  if(!order.rowCount)throw new BusinessError("Order tidak ditemukan.");
  const invoices=await c.query<{id:string;gross:string;credits:string;paid:string}>(
   "SELECT inv.id::text,inv.gross::text,COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=inv.delivery_id),0)::text AS credits,COALESCE((SELECT SUM(p.amount) FROM delivery_payments p WHERE p.invoice_id=inv.id),0)::text AS paid FROM delivery_invoices inv JOIN delivery_notes d ON d.id=inv.delivery_id WHERE d.order_id=$1 AND inv.status='issued' ORDER BY inv.issued_at,inv.id FOR UPDATE OF inv",[data.orderId]);
  let remaining=cents(data.amount);
  const due=invoices.rows.reduce((sum,i)=>sum+Math.max(0,cents(Number(i.gross))-cents(Number(i.credits))-cents(Number(i.paid))),0);
  if(remaining<=0||remaining>due)throw new BusinessError("Nominal pembayaran melebihi sisa piutang order.");
  const batch=await c.query<{id:string}>("INSERT INTO payment_batches(request_key,order_id,total_amount,payment_method,payment_reference,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text",
    [data.requestKey,data.orderId,data.amount,data.method,data.reference.trim().slice(0,120),actor]);
  for(const i of invoices.rows){
   const owed=Math.max(0,cents(Number(i.gross))-cents(Number(i.credits))-cents(Number(i.paid)));
   const paid=Math.min(owed,remaining);
   if(paid>0){
    await c.query("INSERT INTO delivery_payments(request_key,invoice_id,amount,payment_method,payment_reference,created_by,batch_id) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6)",
    [i.id,paid/100,data.method,data.reference.trim().slice(0,120),actor,batch.rows[0].id]);
    remaining-=paid;
   }
   if(remaining===0)break;
  }
  if(remaining!==0)throw new BusinessError("Pembagian pembayaran gagal.");
  if(data.method==="cash")await c.query(
   "INSERT INTO cash_ledger_entries(request_key,entry_date,direction,category,description,amount,reference_type,reference_id,created_by) VALUES($1,(now() AT TIME ZONE 'Asia/Makassar')::date,'IN','PENJUALAN CASH',$2,$3,'order',$4,$5) ON CONFLICT(request_key) DO NOTHING",
   [data.requestKey,"Pembayaran tunai untuk order "+data.orderId,data.amount,data.orderId,actor]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'order.payment','customer_order',$2)",[actor,data.orderId]);
  return batch.rows[0].id;
 });
}
export async function updatePhysicalReceipt(data:{orderId:string;type:string;status:string},actor:string){
 if(!uuid(data.orderId)||data.type.length>40||!['not_handed_over','handed_over','returned_to_office'].includes(data.status))
 throw new BusinessError("Data kwitansi fisik tidak valid.");
 const updated=await transaction(async c=>{
  const r=await c.query("UPDATE customer_orders SET physical_receipt_type=$2,physical_receipt_status=$3 WHERE id=$1 RETURNING id",[data.orderId,data.type.trim(),data.status]);
  if(!r.rowCount)throw new BusinessError("Kwitansi tidak ditemukan.");
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'receipt.physical.update','customer_order',$2)",[actor,data.orderId]);
  return r.rowCount;
 });
 return updated;
}


export type OrderDraft={id:string;document_number:string|null;outlet_id:string;outlet:string;status:string;note:string;desired_delivery:string|null;items:{id:string;product_id:string;name:string;quantity:number;unit_price:string;shipped:number}[]};
export async function getOrderDraft(id:string):Promise<OrderDraft|null>{
 if(!uuid(id))return null;
 const rows=await query<{id:string;document_number:string|null;outlet_id:string;outlet:string;status:string;note:string;desired_delivery:string|null}>(
  "SELECT o.id::text,o.document_number,o.outlet_id::text,t.name AS outlet,o.status,o.note,o.desired_delivery::text FROM customer_orders o JOIN outlets t ON t.id=o.outlet_id WHERE o.id=$1",[id]);
 if(!rows[0])return null;
 const items=await query<OrderDraft["items"][number]>(
  "SELECT i.id::text,i.product_id::text,p.name,i.quantity,i.unit_price::text,COALESCE((SELECT SUM(x.quantity)::int FROM delivery_note_items x WHERE x.order_item_id=i.id),0)::int AS shipped FROM customer_order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=$1 ORDER BY p.name",[id]);
 return {...rows[0],items};
}
export async function updateOrderDraft(data:{id:string;items:{id:string;quantity:number}[];date:string;note:string;reason:string},actor:string){
 if(!uuid(data.id)||!Array.isArray(data.items)||data.items.length<1||data.items.length>50||
 data.items.some(i=>!uuid(i.id)||!positive(i.quantity))||
 new Set(data.items.map(i=>i.id)).size!==data.items.length||
 (data.date!==""&&!validDate(data.date))||data.reason.trim().length<5)
 throw new BusinessError("Data perubahan order atau alasan tidak valid.");
 return transaction(async c=>{
  const order=await c.query<{status:string;note:string;desired_delivery:string|null}>("SELECT status,note,desired_delivery::text FROM customer_orders WHERE id=$1 FOR UPDATE",[data.id]);
  if(!order.rows[0]||order.rows[0].status!=="confirmed")throw new BusinessError("Hanya order belum dikirim yang dapat diedit.");
  const d=await c.query("SELECT id FROM delivery_notes WHERE order_id=$1 LIMIT 1",[data.id]);
  if(d.rowCount)throw new BusinessError("Order yang sudah dikirim harus memakai transaksi koreksi, bukan mengubah order.");
  const rows=await c.query<{id:string;quantity:number}>("SELECT id::text,quantity FROM customer_order_items WHERE order_id=$1 FOR UPDATE",[data.id]);
  if(rows.rows.length!==data.items.length||data.items.some(i=>!rows.rows.some(x=>x.id===i.id)))
    throw new BusinessError("Daftar item sudah berubah. Muat ulang halaman.");
  const before={order:order.rows[0],items:rows.rows};
  await c.query("UPDATE customer_orders SET desired_delivery=$2,note=$3 WHERE id=$1",[data.id,data.date||null,data.note.trim().slice(0,400)]);
  for(const item of data.items)await c.query("UPDATE customer_order_items SET quantity=$2 WHERE id=$1",[item.id,item.quantity]);
  await c.query("INSERT INTO order_audit_events(order_id,actor_id,action,reason,previous_state,next_state) VALUES($1,$2,'edited',$3,$4::jsonb,$5::jsonb)",
   [data.id,actor,data.reason.trim().slice(0,400),JSON.stringify(before),JSON.stringify({date:data.date,note:data.note,items:data.items})]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'order.edit','customer_order',$2)",[actor,data.id]);
 });
}
export async function cancelOrderDraft(id:string,reason:string,actor:string){
 if(!uuid(id)||reason.trim().length<5)throw new BusinessError("Tulis alasan pembatalan minimal 5 karakter.");
 return transaction(async c=>{
  const row=await c.query<{status:string;note:string}>("SELECT status,note FROM customer_orders WHERE id=$1 FOR UPDATE",[id]);
  if(!row.rows[0]||row.rows[0].status!=="confirmed")throw new BusinessError("Hanya order belum dikirim yang dapat dibatalkan.");
  const deliveries=await c.query("SELECT id FROM delivery_notes WHERE order_id=$1 LIMIT 1",[id]);
  if(deliveries.rowCount)throw new BusinessError("Order dengan pengiriman tidak boleh dibatalkan begitu saja.");
  await c.query("UPDATE customer_orders SET status='cancelled' WHERE id=$1",[id]);
  await c.query("INSERT INTO order_audit_events(order_id,actor_id,action,reason,previous_state,next_state) VALUES($1,$2,'cancelled',$3,$4::jsonb,$5::jsonb)",
   [id,actor,reason.trim().slice(0,400),JSON.stringify(row.rows[0]),JSON.stringify({status:"cancelled"})]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'order.cancel','customer_order',$2)",[actor,id]);
 });
}
export async function listOrderAudit(id:string){
 if(!uuid(id))return [];
 return query<{action:string;reason:string;created_at:Date;actor_id:string}>(
  "SELECT action,reason,created_at,actor_id FROM order_audit_events WHERE order_id=$1 ORDER BY created_at DESC LIMIT 50",[id]);
}
