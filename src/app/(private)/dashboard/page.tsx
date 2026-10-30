import Link from "next/link";
import { ArrowUpRight, Boxes, PackageSearch, ShoppingBag, Wallet } from "lucide-react";
import { requireActor } from "@/lib/access";
import { listSales,summary,listProducts } from "@/lib/operations";
import { Empty,PageHead,Panel,rupiah } from "@/components/ui";
export const dynamic="force-dynamic";
export default async function Dashboard(){
 const actor=await requireActor();
 const [s,products,sales]=await Promise.all([summary(),listProducts(),listSales(actor.id,actor.role)]);
 const stats=[{label:"Penjualan hari ini",value:rupiah(s.total),icon:Wallet,info:"Transaksi selesai"},{label:"Transaksi hari ini",value:String(s.count),icon:ShoppingBag,info:"Total transaksi"},{label:"Produk aktif",value:String(s.products),icon:Boxes,info:"Dalam katalog"},{label:"Stok perlu perhatian",value:String(s.low),icon:PackageSearch,info:"Mencapai batas minimum"}];
 return <><PageHead eyebrow="OVERVIEW / STOKLY" title={"Selamat datang, "+actor.name.split(" ")[0]} description="Pantau kinerja bisnis dan aktivitas operasional dari satu tempat."/>
 <div className="metrics-grid">{stats.map(({label,value,icon:Icon,info})=><section className="metric" key={label}><div className="metric-label">{label}<Icon size={19}/></div><strong>{value}</strong><span className="small-muted">{info}</span></section>)}</div>
 <div className="dash-columns"><Panel title="Akses cepat" detail="Tindakan operasional"><div className="quick-links"><Link href="/products"><Boxes size={19}/> Lihat persediaan <ArrowUpRight size={16}/></Link><Link href="/sales"><ShoppingBag size={19}/> Buat penjualan <ArrowUpRight size={16}/></Link>{actor.role!=="marketing"&&<Link href="/receipts"><PackageSearch size={19}/> Terima barang <ArrowUpRight size={16}/></Link>}</div></Panel>
 <Panel title="Stok menipis" detail="Prioritas pengadaan">{products.filter(p=>p.stock<=p.min_stock).length===0?<Empty label="peringatan stok"/>:<div className="simple-list">{products.filter(p=>p.stock<=p.min_stock).slice(0,5).map(p=><div key={p.id}><span><b>{p.name}</b><small>{p.sku}</small></span><span className="status-danger">{p.stock} tersisa</span></div>)}</div>}</Panel></div>
 <Panel title="Transaksi terbaru" detail="Aktivitas penjualan">{sales.length===0?<Empty label="penjualan"/>:<div className="table-wrap"><table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Petugas</th><th>Total</th><th>Status</th></tr></thead><tbody>{sales.slice(0,8).map(s=><tr key={s.id}><td className="strong-cell">{s.number}</td><td>{new Date(s.created_at).toLocaleDateString("id-ID")}</td><td>{s.actor_name}</td><td>{rupiah(s.total)}</td><td><span className="status-success">Selesai</span></td></tr>)}</tbody></table></div>}</Panel>
 </>;
}
