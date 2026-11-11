import { query,transaction } from "@/lib/db";
import { BusinessError } from "@/lib/operations";

export async function suppliers(){
 return query<{id:string;name:string;phone:string;address:string;notes:string;active:boolean}>(
   "SELECT id::text,name,phone,address,notes,active FROM suppliers ORDER BY active DESC,name LIMIT 200");
}
export async function outletGroups(){
 return query<{id:string;name:string}>("SELECT id::text,name FROM outlet_groups WHERE active=true ORDER BY name");
}
export async function createOutletGroup(name:string,actor:string){
 if(name.trim().length<2||name.length>160)throw new BusinessError("Nama kelompok outlet harus terdiri dari 2–160 karakter.");
 await transaction(async c=>{
  const r=await c.query<{id:string}>("INSERT INTO outlet_groups(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET active=true RETURNING id::text",[name.trim()]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'outlet_group.create','outlet_group',$2)",[actor,r.rows[0].id]);
 });
}
export async function outlets(){
 return query<{id:string;name:string;phone:string;pic_name:string;address:string;latitude:string|null;longitude:string|null;group_id:string|null;group_name:string|null;active:boolean}>(
   "SELECT o.id::text,o.name,o.phone,o.pic_name,o.address,o.latitude::text,o.longitude::text,o.group_id::text,g.name AS group_name,o.active FROM outlets o LEFT JOIN outlet_groups g ON g.id=o.group_id ORDER BY o.active DESC,o.name LIMIT 200");
}
export async function grades(){
 return query<{id:string;code:string;name:string}>("SELECT id::text,code,name FROM coconut_grades WHERE active=true ORDER BY name");
}
export async function priceHistory(){
 return query<{id:string;name:string;old_price:string;new_price:string;reason:string;created_at:Date}>(
   "SELECT h.id::text,p.name,p.price::text old_price,h.price::text new_price,h.reason,h.created_at FROM product_price_history h JOIN products p ON p.id=h.product_id WHERE h.outlet_id IS NULL ORDER BY h.created_at DESC LIMIT 50");
}
function clean(v:string,max=160){return v.trim().slice(0,max)}
export function money(v:number){return Number.isFinite(v)&&v>=0&&v<=1e12&&Math.round(v*100)===v*100}
export function quantity(v:number){return Number.isSafeInteger(v)&&v>=0&&v<=100000000}
export async function saveProduct(data:{id?:string;name:string;category:string;unit:string;description:string;minStock:number},actor:string){
 if(!data.name.trim()||!quantity(data.minStock))throw new BusinessError("Nama produk dan stok minimum harus valid.");
 if(!["PCS","BUTIR","KG","LITER","CUP","PACK"].includes(data.unit))throw new BusinessError("Satuan tidak tersedia.");
 await transaction(async c=>{
  if(data.id){
   const old=await c.query("SELECT id FROM products WHERE id=$1 AND active=true FOR UPDATE",[data.id]);
   if(!old.rowCount)throw new BusinessError("Produk aktif tidak ditemukan.");
   // Identitas SKU tetap karena terhubung dengan riwayat transaksi lama.
   await c.query("UPDATE products SET name=$2,category=$3,unit=$4,description=$5,min_stock=$6,updated_at=now() WHERE id=$1",
    [data.id,clean(data.name),clean(data.category,90)||"Umum",data.unit,clean(data.description,1000),data.minStock]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'product.edit','product',$2)",[actor,data.id]);
  }else{
   // Generate SKU berurutan; lock transaksi mencegah dua operator memperoleh kode sama.
   await c.query("SELECT pg_advisory_xact_lock(hashtext('stokly:product:sku:generate'))");
   const latest=await c.query<{last_number:string}>(
    "SELECT COALESCE(MAX(substring(sku from '^PRD-([0-9]+)$')::bigint),0)::text AS last_number FROM products WHERE sku ~ '^PRD-[0-9]+$'");
   const next=BigInt(latest.rows[0]?.last_number||"0")+1n;
   const sku="PRD-"+next.toString().padStart(3,"0");
   const inserted=await c.query<{id:string}>(
    "INSERT INTO products(sku,name,category,unit,description,min_stock,price) VALUES($1,$2,$3,$4,$5,$6,0) RETURNING id",
    [sku,clean(data.name),clean(data.category,90)||"Umum",data.unit,clean(data.description,1000),data.minStock]);
   await c.query("INSERT INTO inventory_balances(product_id,quantity) VALUES($1,0)",[inserted.rows[0].id]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'product.create','product',$2)",[actor,inserted.rows[0].id]);
  }
 });
}
export async function setProductPrice(productId:string,price:number,reason:string,actor:string){
 if(!money(price)||reason.trim().length<5)throw new BusinessError("Harga atau alasan perubahan tidak valid.");
 await transaction(async c=>{
   const product=await c.query("SELECT id FROM products WHERE id=$1 AND active=true FOR UPDATE",[productId]);
   if(!product.rowCount)throw new BusinessError("Produk aktif tidak ditemukan.");
   await c.query("UPDATE products SET price=$2,updated_at=now() WHERE id=$1",[productId,price]);
   await c.query("INSERT INTO product_price_history(product_id,price,reason,created_by) VALUES($1,$2,$3,$4)",[productId,price,clean(reason,400),actor]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'product.price','product',$2)",[actor,productId]);
 });
}
export async function correctStock(productId:string,expected:number,actual:number,reason:string,actor:string){
 if(!quantity(expected)||!quantity(actual)||reason.trim().length<5)throw new BusinessError("Jumlah dan alasan koreksi tidak valid.");
 await transaction(async c=>{
   const r=await c.query<{quantity:number}>("SELECT quantity FROM inventory_balances WHERE product_id=$1 FOR UPDATE",[productId]);
   if(!r.rows[0])throw new BusinessError("Stok produk tidak ditemukan.");
   if(r.rows[0].quantity!==expected)throw new BusinessError("Stok berubah sejak dibuka. Muat ulang sebelum koreksi.");
   if(expected===actual)throw new BusinessError("Tidak ada selisih stok.");
   const a=await c.query<{id:string}>("INSERT INTO stock_adjustments(product_id,before_qty,after_qty,reason,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",
    [productId,expected,actual,clean(reason,400),actor]);
   await c.query("UPDATE inventory_balances SET quantity=$2,updated_at=now() WHERE product_id=$1",[productId,actual]);
   await c.query("INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id) VALUES($1,$2,'adjustment',$3,$4)",
    [productId,actual-expected,a.rows[0].id,actor]);
   await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'stock.correct','product',$2)",[actor,productId]);
 });
}
export async function archiveProduct(productId:string,actor:string){
 await transaction(async c=>{
  const p=await c.query("UPDATE products SET active=false,updated_at=now() WHERE id=$1 AND active=true RETURNING id",[productId]);
  if(!p.rowCount)throw new BusinessError("Produk tidak ditemukan atau sudah diarsipkan.");
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'product.archive','product',$2)",[actor,productId]);
 });
}
export async function saveSupplier(input:{id?:string;name:string;phone:string;address:string;notes:string},actor:string){
 if(!input.name.trim())throw new BusinessError("Nama supplier wajib diisi.");
 const values=[clean(input.name),clean(input.phone,40),clean(input.address,1000),clean(input.notes,1000)];
 await transaction(async c=>{
  const r=input.id
   ?await c.query<{id:string}>("UPDATE suppliers SET name=$2,phone=$3,address=$4,notes=$5,updated_at=now() WHERE id=$1 AND active=true RETURNING id",[input.id,...values])
   :await c.query<{id:string}>("INSERT INTO suppliers(name,phone,address,notes) VALUES($1,$2,$3,$4) RETURNING id",values);
  if(!r.rowCount)throw new BusinessError("Supplier tidak tersedia.");
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,$2,'supplier',$3)",[actor,input.id?"supplier.edit":"supplier.create",r.rows[0].id]);
 });
}
export async function archiveSupplier(id:string,actor:string){
 await transaction(async c=>{
  const r=await c.query<{id:string}>("UPDATE suppliers SET active=false,updated_at=now() WHERE id=$1 AND active=true RETURNING id",[id]);
  if(!r.rowCount)throw new BusinessError("Supplier tidak ditemukan.");
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'supplier.archive','supplier',$2)",[actor,id]);
 });
}
export async function saveOutlet(input:{id?:string;name:string;phone:string;pic:string;address:string;lat:number|null;lng:number|null;groupId:string},actor:string){
 if(!input.name.trim())throw new BusinessError("Nama outlet wajib diisi.");
 if((input.lat===null)!==(input.lng===null)||
 (input.lat!==null&&(!Number.isFinite(input.lat)||input.lat< -90||input.lat>90))||
 (input.lng!==null&&(!Number.isFinite(input.lng)||input.lng< -180||input.lng>180)))
 throw new BusinessError("Koordinat lokasi harus lengkap dan valid.");
 if(input.groupId&&!/^[a-f0-9-]{36}$/i.test(input.groupId))throw new BusinessError("G.O tidak valid.");
 const values=[clean(input.name,180),clean(input.phone,40),clean(input.pic,120),clean(input.address,1000),input.lat,input.lng,input.groupId||null];
 await transaction(async c=>{
  const r=input.id
   ?await c.query<{id:string}>("UPDATE outlets SET name=$2,phone=$3,pic_name=$4,address=$5,latitude=$6,longitude=$7,group_id=$8,updated_at=now() WHERE id=$1 AND active=true RETURNING id",[input.id,...values])
   :await c.query<{id:string}>("INSERT INTO outlets(name,phone,pic_name,address,latitude,longitude,group_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",values);
  if(!r.rowCount)throw new BusinessError("Outlet tidak tersedia.");
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,$2,'outlet',$3)",[actor,input.id?"outlet.edit":"outlet.create",r.rows[0].id]);
 });
}
export async function archiveOutlet(id:string,actor:string){
 await transaction(async c=>{
  const r=await c.query<{id:string}>("UPDATE outlets SET active=false,updated_at=now() WHERE id=$1 AND active=true RETURNING id",[id]);
  if(!r.rowCount)throw new BusinessError("Outlet tidak ditemukan.");
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'outlet.archive','outlet',$2)",[actor,id]);
 });
}
