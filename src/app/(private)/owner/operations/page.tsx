import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {ownerOperations,ownerActivity} from "@/lib/owner-operations";
import {PageHead,Panel} from "@/components/ui";
export const dynamic="force-dynamic";
export default async function OwnerOperations(){
 await requireOwner();
 const [s,events]=await Promise.all([ownerOperations(),ownerActivity(30)]);
 const items=[
  {name:"Order belum dikirim",n:s.open_orders+s.partial_orders,url:"/orders",desc:"Termasuk pengiriman sebagian"},
  {name:"Batch belum QC",n:s.uninspected_batches,url:"/qc",desc:s.uninspected_pcs+" butir belum diperiksa"},
  {name:"Bahan siap produksi",n:s.ready_batches,url:"/production",desc:"Sudah lolos QC"},
  {name:"Stok menipis",n:s.low_stock,url:"/products",desc:"Perlu perhatian"},
  {name:"Komplain terbuka",n:s.open_complaints,url:"/outlet-returns",desc:"Belum diselesaikan"},
  {name:"Proses HPP belum lengkap",n:s.pending_cost_runs,url:"/costing",desc:"Alokasi biaya/hasil QC"}
 ];
 return <><PageHead eyebrow="OWNER / MONITOR OPERASIONAL" title="Pengawasan Operasional" description="Pekerjaan yang masih terbuka di pembelian, QC, produksi, stok, dan pengiriman."/>
 <div className="metrics-grid">{items.map(x=><Link key={x.name} href={x.url} className="metric" style={{display:"block",textDecoration:"none",color:"inherit"}}><div className="metric-label">{x.name}</div><strong>{x.n}</strong><span className="dashboard-stat-foot">{x.desc} · Buka</span></Link>)}</div>
 <Panel title="Jejak aktivitas terbaru"><div className="table-wrap"><table><thead><tr><th>Waktu WITA</th><th>Aksi</th><th>Jenis</th><th>Identitas sistem</th></tr></thead>
  <tbody>{events.map((e,i)=><tr key={i}><td>{new Date(e.created_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td><td>{e.action}</td><td>{e.entity}</td><td>{e.actor_id==="stokly:room:admin"?"Room Admin":e.actor_id==="stokly:room:marketing"?"Room Marketing":e.actor_id}</td></tr>)}</tbody></table></div>
 <p className="form-hint">Room staf bebas masuk sesuai pengaturan. Riwayat room hanya membedakan peran, belum identitas petugas per orang.</p></Panel>
 </>;
}
