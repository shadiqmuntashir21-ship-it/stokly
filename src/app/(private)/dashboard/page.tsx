import Link from "next/link";
import { ArrowUpRight, Boxes, ShoppingBag, Wallet } from "lucide-react";
import { requireActor } from "@/lib/access";
import { listSales, summary, listProducts } from "@/lib/operations";
import { query } from "@/lib/db";
import { Empty, PageHead, Panel, rupiah } from "@/components/ui";
export const dynamic="force-dynamic";
export default async function Dashboard(){
  const actor=await requireActor();
  const [products,sales]=await Promise.all([listProducts(),listSales(actor.id,actor.role)]);
  const globalStats=actor.role==="marketing"?null:await summary();
  const own=actor.role==="marketing" ? await query<{total:string;count:string}>(
    "SELECT COALESCE(SUM(total),0)::text total, COUNT(*)::text count FROM sales WHERE status='completed' AND created_by=$1 AND (created_at AT TIME ZONE 'Asia/Jakarta')::date=(now() AT TIME ZONE 'Asia/Jakarta')::date",[actor.id]):null;
  const totals=actor.role==="marketing"
   ?[{label:"Penjualan saya hari ini",value:rupiah(own?.[0]?.total||0),icon:Wallet},{label:"Transaksi saya hari ini",value:own?.[0]?.count||"0",icon:ShoppingBag}]
   :[{label:"Penjualan hari ini",value:rupiah(globalStats?.total||0),icon:Wallet},{label:"Transaksi hari ini",value:String(globalStats?.count||0),icon:ShoppingBag}];
  const stats=[...totals,{label:"Produk aktif",value:String(products.length),icon:Boxes}];
  return <><PageHead eyebrow="OVERVIEW / STOKLY" title={"Selamat datang, "+actor.name.split(" ")[0]} description="Pantau kinerja bisnis dan aktivitas operasional."/>
    <div className="metrics-grid">{stats.map(({label,value,icon:Icon})=><section className="metric" key={label}><div className="metric-label">{label}<Icon size={19}/></div><strong>{value}</strong><span className="small-muted">Data dari sistem STOKLY</span></section>)}</div>
    <div className="dash-columns"><Panel title="Akses cepat"><div className="quick-links"><Link href="/products"><Boxes size={19}/> Produk & persediaan <ArrowUpRight size={16}/></Link><Link href="/sales"><ShoppingBag size={19}/> Catat penjualan <ArrowUpRight size={16}/></Link>{actor.role!=="marketing"&&<Link href="/receipts">Terima barang <ArrowUpRight size={16}/></Link>}</div></Panel>
    <Panel title="Stok menipis">{products.filter(p=>p.stock<=p.min_stock).length===0?<Empty label="peringatan stok"/>:<div className="simple-list">{products.filter(p=>p.stock<=p.min_stock).slice(0,5).map(p=><div key={p.id}><span><b>{p.name}</b><small>{p.sku}</small></span><span className="status-danger">{p.stock} tersisa</span></div>)}</div>}</Panel></div>
    <Panel title="Transaksi terbaru">{sales.length===0?<Empty label="penjualan"/>:<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Petugas</th><th>Total</th></tr></thead><tbody>{sales.slice(0,8).map(s=><tr key={s.id}><td className="mono">{s.number}</td><td>{new Date(s.created_at).toLocaleDateString("id-ID")}</td><td>{s.actor_name}</td><td>{rupiah(s.total)}</td></tr>)}</tbody></table></div>}</Panel>
  </>;
}
