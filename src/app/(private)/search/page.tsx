import Link from "next/link";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,Empty,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
type Order={id:string;document_number:string|null;outlet:string;status:string};
type Product={id:string;name:string;sku:string;price:string};
type Outlet={id:string;name:string;address:string|null};
type Supplier={id:string;name:string;phone:string|null};
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}){
 const actor=await requireActor();
 const q=(await searchParams).q?.trim().slice(0,80)||"";
 const pattern="%"+q.replaceAll("%","\\%").replaceAll("_","\\_")+"%";
 const [orders,products,outlets,suppliers]=q?await Promise.all([
  query<Order>("SELECT o.id::text,o.document_number,t.name AS outlet,o.status FROM customer_orders o JOIN outlets t ON t.id=o.outlet_id WHERE (o.document_number ILIKE $1 OR t.name ILIKE $1) ORDER BY o.created_at DESC LIMIT 30",[pattern]),
  query<Product>("SELECT id::text,name,sku,price::text FROM products WHERE active=true AND (name ILIKE $1 OR sku ILIKE $1) ORDER BY name LIMIT 20",[pattern]),
  query<Outlet>("SELECT id::text,name,address FROM outlets WHERE active=true AND (name ILIKE $1 OR address ILIKE $1) ORDER BY name LIMIT 20",[pattern]),
  actor.role==="marketing"?Promise.resolve([]):query<Supplier>("SELECT id::text,name,phone FROM suppliers WHERE active=true AND (name ILIKE $1 OR phone ILIKE $1) ORDER BY name LIMIT 20",[pattern])
 ]):[[],[],[],[]];
 return <><PageHead eyebrow="PENCARIAN / SEMUA DATA" title="Cari di STOKLY" description="Cari nomor kwitansi, nama outlet, produk, SKU, atau supplier dari satu tempat."/>
 <Panel title="Pencarian cepat">
  <form method="get" className="form-grid"><label className="wide">Kata kunci<input name="q" defaultValue={q} autoFocus maxLength={80} placeholder="Contoh: 9000000, RM Sidrap atau kelapa kupas"/></label><button className="primary-button" type="submit">Cari Data</button></form>
 </Panel>
 {q&&<><Panel title="Order & Kwitansi" detail={orders.length+" hasil"}>{orders.length?<div className="simple-list">{orders.map(x=><div key={x.id}><span><strong>{x.document_number||"Order lama"} · {x.outlet}</strong><small>{x.status}</small></span><Link href={"/orders/"+x.id}>Buka →</Link></div>)}</div>:<Empty label="order yang cocok"/>}</Panel>
 <Panel title="Produk & Stok" detail={products.length+" hasil"}>{products.length?<div className="simple-list">{products.map(x=><div key={x.id}><span><strong>{x.name}</strong><small>{x.sku} · {rupiah(x.price)}</small></span><Link href="/products">Lihat →</Link></div>)}</div>:<Empty label="produk yang cocok"/>}</Panel>
 <Panel title="Outlet" detail={outlets.length+" hasil"}>{outlets.length?<div className="simple-list">{outlets.map(x=><div key={x.id}><span><strong>{x.name}</strong><small>{x.address||"Alamat belum diisi"}</small></span><Link href="/outlets">Lihat →</Link></div>)}</div>:<Empty label="outlet yang cocok"/>}</Panel>
 {actor.role!=="marketing"&&<Panel title="Supplier" detail={suppliers.length+" hasil"}>{suppliers.length?<div className="simple-list">{suppliers.map(x=><div key={x.id}><span><strong>{x.name}</strong><small>{x.phone||"Tanpa nomor"}</small></span><Link href="/suppliers">Lihat →</Link></div>)}</div>:<Empty label="supplier yang cocok"/>}</Panel>}
 </>}
 </>;
}
