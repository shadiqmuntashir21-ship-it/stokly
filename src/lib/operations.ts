import { transaction, query } from "@/lib/db";
import type { Role } from "@/lib/access";

export class BusinessError extends Error {}
function positiveInteger(v:number){return Number.isSafeInteger(v)&&v>0}
function money(v:number){return Number.isFinite(v)&&v>=0&&Number.isSafeInteger(Math.round(v*100))}

export async function listProducts(){
  return query<{id:string;sku:string;name:string;category:string;price:string;stock:number;min_stock:number}>(
    "SELECT p.id,p.sku,p.name,p.category,p.price::text,COALESCE(b.quantity,0)::int AS stock,p.min_stock FROM products p LEFT JOIN inventory_balances b ON b.product_id=p.id WHERE p.active=true ORDER BY p.name");
}
export async function listSales(actorId:string, role:Role){
  return query<{id:string;number:string;created_at:Date;total:string;status:string;actor_name:string}>(
    `SELECT s.id,s.number,s.created_at,s.total::text,s.status,COALESCE(u.name,'-') actor_name FROM sales s LEFT JOIN "user" u ON u.id=s.created_by WHERE ($1='owner' OR $1='admin' OR s.created_by=$2) ORDER BY s.created_at DESC LIMIT 60`,[role,actorId]);
}
export async function createProduct(input:{sku:string;name:string;category:string;price:number;minStock:number},actorId:string){
 if(!input.sku.trim()||!input.name.trim()||!money(input.price)||!Number.isSafeInteger(input.minStock)||input.minStock<0) throw new BusinessError("Data produk tidak valid.");
 return transaction(async c=>{
   const r=await c.query<{id:string}>(`INSERT INTO products(sku,name,category,price,min_stock) VALUES($1,$2,$3,$4,$5) RETURNING id`,[input.sku.trim().toUpperCase(),input.name.trim(),input.category.trim()||'Umum',input.price,input.minStock]);
   await c.query("INSERT INTO inventory_balances(product_id,quantity) VALUES($1,0)",[r.rows[0].id]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'product.create','product',$2)",[actorId,r.rows[0].id]);
   return r.rows[0].id;
 });
}
export async function receipt(input:{productId:string;quantity:number;note:string},actorId:string){
 if(!positiveInteger(input.quantity))throw new BusinessError("Jumlah harus lebih dari nol.");
 return transaction(async c=>{
   const p=await c.query("SELECT id FROM products WHERE id=$1 AND active=true",[input.productId]);
   if(!p.rowCount)throw new BusinessError("Produk tidak ditemukan.");
   const r=await c.query<{id:string}>("INSERT INTO goods_receipts(created_by,note) VALUES($1,$2) RETURNING id",[actorId,input.note]);
   await c.query("UPDATE inventory_balances SET quantity=quantity+$2,updated_at=now() WHERE product_id=$1",[input.productId,input.quantity]);
   await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'receipt',$3,$4)",[input.productId,input.quantity,r.rows[0].id,actorId]);
   return r.rows[0].id;
 });
}
export async function sell(input:{items:{productId:string;quantity:number}[];key:string},actorId:string){
 if(!input.key||input.key.length>120||input.items.length<1||input.items.length>60)throw new BusinessError("Transaksi tidak valid.");
 if(input.items.some(i=>!positiveInteger(i.quantity))||new Set(input.items.map(i=>i.productId)).size!==input.items.length)throw new BusinessError("Produk duplikat atau jumlah salah.");
 return transaction(async c=>{
   // All requests sharing the same idempotency key are serialized by Postgres.
   await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",[actorId+":"+input.key]);
   const existing=await c.query<{id:string}>("SELECT id FROM sales WHERE created_by=$1 AND idempotency_key=$2",[actorId,input.key]);
   if(existing.rows[0])return existing.rows[0].id;
   const products=await c.query<{id:string;price:string;quantity:number}>(
     "SELECT p.id,p.price::text,b.quantity FROM products p JOIN inventory_balances b ON b.product_id=p.id WHERE p.id=ANY($1::uuid[]) AND p.active=true ORDER BY p.id FOR UPDATE OF b",[input.items.map(i=>i.productId)]
   );
   if(products.rowCount!==input.items.length)throw new BusinessError("Ada produk yang tidak tersedia.");
   let totalCents=0;
   for(const item of input.items){
      const p=products.rows.find(p=>p.id===item.productId)!;
      if(p.quantity<item.quantity)throw new BusinessError("Stok tidak cukup untuk salah satu produk.");
      const cents=Math.round(Number(p.price)*100);
      totalCents+=cents*item.quantity;
   }
   if(!Number.isSafeInteger(totalCents))throw new BusinessError("Jumlah transaksi terlalu besar.");
   const s=await c.query<{id:string}>(
      "INSERT INTO sales(created_by,idempotency_key,total,status) VALUES($1,$2,$3,'completed') RETURNING id",
      [actorId,input.key,totalCents/100]
   );
   for(const item of input.items){
      const p=products.rows.find(p=>p.id===item.productId)!;
      await c.query("INSERT INTO sale_items(sale_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)",[s.rows[0].id,item.productId,item.quantity,p.price]);
      await c.query("UPDATE inventory_balances SET quantity=quantity-$2,updated_at=now() WHERE product_id=$1",[item.productId,item.quantity]);
      await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'sale',$3,$4)",[item.productId,-item.quantity,s.rows[0].id,actorId]);
   }
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'sale.completed','sale',$2)",[actorId,s.rows[0].id]);
   return s.rows[0].id;
 });
}
export async function returnSale(input:{saleId:string;productId:string;quantity:number;restock:boolean;note:string},actorId:string){
 if(!positiveInteger(input.quantity)||!input.note.trim())throw new BusinessError("Jumlah dan alasan retur wajib diisi.");
 return transaction(async c=>{
   const line=await c.query<{quantity:number;returned:number}>(
     `SELECT si.quantity,COALESCE((SELECT SUM(r.quantity)::int FROM sale_returns r WHERE r.sale_id=si.sale_id AND r.product_id=si.product_id),0)::int AS returned FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.sale_id=$1 AND si.product_id=$2 AND s.status='completed' FOR UPDATE OF si`,
     [input.saleId,input.productId]);
   if(!line.rows[0]||line.rows[0].quantity-line.rows[0].returned<input.quantity)throw new BusinessError("Jumlah retur melebihi sisa barang yang dijual.");
   const r=await c.query<{id:string}>("INSERT INTO sale_returns(sale_id,product_id,quantity,restock,note,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[input.saleId,input.productId,input.quantity,input.restock,input.note.trim(),actorId]);
   if(input.restock){
     await c.query("UPDATE inventory_balances SET quantity=quantity+$2,updated_at=now() WHERE product_id=$1",[input.productId,input.quantity]);
     await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'return',$3,$4)",[input.productId,input.quantity,r.rows[0].id,actorId]);
   }
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'sale.return','return',$2)",[actorId,r.rows[0].id]);
   return r.rows[0].id;
 });
}
export async function summary(){
 const [totals,low,trend]=await Promise.all([
  query<{sales_total:string;sales_count:string;product_count:string}>(
    `SELECT (SELECT COALESCE(SUM(total),0)::text FROM sales WHERE status='completed' AND (created_at AT TIME ZONE 'Asia/Jakarta')::date=(now() AT TIME ZONE 'Asia/Jakarta')::date) sales_total,(SELECT COUNT(*)::text FROM sales WHERE status='completed' AND (created_at AT TIME ZONE 'Asia/Jakarta')::date=(now() AT TIME ZONE 'Asia/Jakarta')::date) sales_count,(SELECT COUNT(*)::text FROM products WHERE active=true) product_count`),
  query<{count:string}>(`SELECT COUNT(*)::text count FROM products p LEFT JOIN inventory_balances b ON b.product_id=p.id WHERE p.active=true AND COALESCE(b.quantity,0)<=p.min_stock`),
  query<{day:string;total:string}>(`SELECT to_char(date_trunc('day',created_at),'DD Mon') day,SUM(total)::text total FROM sales WHERE status='completed' AND created_at>=now()-interval '7 days' GROUP BY date_trunc('day',created_at) ORDER BY date_trunc('day',created_at)`)
 ]);
 return {total:Number(totals[0]?.sales_total||0),count:Number(totals[0]?.sales_count||0),products:Number(totals[0]?.product_count||0),low:Number(low[0]?.count||0),trend};
}

export async function issueGoods(input:{productId:string;quantity:number;reason:string},actorId:string){
 if(!positiveInteger(input.quantity)||!input.reason.trim()||input.reason.length>400)throw new BusinessError("Jumlah atau alasan pengeluaran tidak valid.");
 return transaction(async c=>{
   const current=await c.query<{quantity:number}>(`SELECT b.quantity FROM inventory_balances b JOIN products p ON p.id=b.product_id WHERE b.product_id=$1 AND p.active=true FOR UPDATE OF b`,[input.productId]);
   if(!current.rows[0])throw new BusinessError("Produk tidak ditemukan.");
   if(current.rows[0].quantity<input.quantity)throw new BusinessError("Stok tidak mencukupi.");
   const result=await c.query<{id:string}>("INSERT INTO goods_issues(product_id,quantity,reason,created_by) VALUES($1,$2,$3,$4) RETURNING id",
   [input.productId,input.quantity,input.reason.trim(),actorId]);
   await c.query("UPDATE inventory_balances SET quantity=quantity-$2,updated_at=now() WHERE product_id=$1",[input.productId,input.quantity]);
   await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'adjustment',$3,$4)",
     [input.productId,-input.quantity,result.rows[0].id,actorId]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'goods.issue','goods_issue',$2)",[actorId,result.rows[0].id]);
   return result.rows[0].id;
 });
}
