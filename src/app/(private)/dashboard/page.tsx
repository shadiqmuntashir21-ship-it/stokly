
import Link from "next/link";
import {ArrowUpRight, Boxes, ShoppingBag, Wallet, PackageCheck, AlertTriangle, ArrowRight, Truck, ClipboardList, BarChart3} from "lucide-react";
import {requireActor} from "@/lib/access";
import {listSales,listProducts} from "@/lib/operations";
import {query} from "@/lib/db";
import {Empty,Panel,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
export default async function Dashboard(){
 const actor=await requireActor();
 const [products,sales,v1,v2]=await Promise.all([
  listProducts(),
  listSales(actor.id,actor.role),
  query<{total:string;count:string}>(`SELECT COALESCE(SUM(total),0)::text total,COUNT(*)::text count FROM sales
   WHERE status='completed' AND (created_at AT TIME ZONE 'Asia/Jakarta')::date=(now() AT TIME ZONE 'Asia/Jakarta')::date
   AND ($1='owner' OR $1='admin' OR created_by=$2)`,[actor.role,actor.id]),
  query<{orders:string;pcs:string}>(`SELECT COUNT(DISTINCT o.id)::text orders,COALESCE(SUM(i.quantity),0)::text pcs
    FROM customer_orders o LEFT JOIN customer_order_items i ON i.order_id=o.id
    WHERE o.status!='cancelled' AND o.ordered_on=(now() AT TIME ZONE 'Asia/Jakarta')::date`)
 ]);
 const low=products.filter(p=>p.stock<=p.min_stock);
 const stats=[
  {label:"Order outlet hari ini",value:v2[0]?.orders||"0",detail:"Alur order STOKLY V2",icon:ClipboardList},
  {label:"Volume order hari ini",value:(Number(v2[0]?.pcs||0)).toLocaleString("id-ID"),detail:"Total unit yang dipesan",icon:Truck},
  {label:"Produk aktif",value:String(products.length),detail:"Produk yang bisa dikelola",icon:Boxes},
  {label:"Stok perlu perhatian",value:String(low.length),detail:"Pada atau di bawah minimum",icon:AlertTriangle}
 ];
 return <>
  <section className="dashboard-hero"><div className="dashboard-hero-copy">
   <p className="eyebrow">OPERASIONAL · KELAPA BRANDING INDONESIA</p>
   <h1>Selamat bekerja, {actor.name.split(" ")[0]}.</h1>
   <p>Pantau aktivitas harian dan kelola usaha kelapa lebih cepat dari satu dashboard.</p>
   <div className="dashboard-hero-actions"><Link href="/orders">Buat order outlet <ArrowRight size={16}/></Link><Link href="/products">Kelola persediaan <ArrowUpRight size={16}/></Link></div>
  </div><div className="dashboard-hero-mark"><img src="/brand/kelapa-brand.webp" alt="Logo Kelapa Branding Indonesia" width="110" height="122" loading="eager"/></div></section>
  <div className="dashboard-section-header"><h2>Ringkasan hari ini</h2><p>Data tercatat · waktu Jakarta</p></div>
  <div className="metrics-grid">{stats.map(({label,value,detail,icon:Icon},index)=><section className={"metric "+(index===3?"dashboard-low":"")} key={label}>
    <div className="metric-label">{label}<Icon size={19}/></div><strong>{value}</strong><span className="dashboard-stat-foot">{detail}</span>
  </section>)}</div>
  <div className="dash-columns">
   <Panel title="Akses cepat" detail="Aktivitas utama"><div className="quick-links">
    <Link href="/orders"><ShoppingBag size={19}/> Order outlet <ArrowUpRight size={16}/></Link>
    <Link href="/outlets"><Truck size={19}/> Data outlet <ArrowUpRight size={16}/></Link>
    <Link href="/products"><PackageCheck size={19}/> Produk & stok <ArrowUpRight size={16}/></Link>
    {actor.role!=="marketing"&&<Link href="/procurement"><Boxes size={19}/> Pembelian kelapa <ArrowUpRight size={16}/></Link>}
    {actor.role==="owner"&&<Link href="/costing"><BarChart3 size={19}/> HPP & biaya produksi <ArrowUpRight size={16}/></Link>}
   </div></Panel>
   <Panel title="Stok perlu perhatian" detail={low.length+" produk"}>{low.length===0?<Empty label="peringatan stok"/>:
    <div className="simple-list">{low.slice(0,7).map(p=><div key={p.id}>
     <span><b>{p.name}</b><small>{p.sku} · Minimum {p.min_stock}</small></span>
     <span className="status-danger">{p.stock} {p.unit}</span>
    </div>)}</div>}</Panel>
  </div>
  <Panel title="Penjualan kasir lama" detail={actor.role==="marketing"?"Transaksi room marketing":"Transaksi kasir V1, tidak termasuk nota outlet V2"}>
   <div style={{padding:"16px 23px 0",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <span className="small-muted">Hari ini · {v1[0]?.count||"0"} transaksi</span><strong style={{fontSize:18,color:"#24563c"}}>{rupiah(v1[0]?.total||0)}</strong>
   </div>
   {sales.length===0?<Empty label="transaksi kasir"/>:<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Petugas</th><th>Nilai</th></tr></thead>
    <tbody>{sales.slice(0,6).map(s=><tr key={s.id}><td className="mono">{s.number}</td><td>{new Date(s.created_at).toLocaleDateString("id-ID")}</td><td>{s.actor_name}</td><td>{rupiah(s.total)}</td></tr>)}</tbody></table></div>}
  </Panel>
 </>;
}
