import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {ownerOutlets} from "@/lib/owner-outlets";
import {parsePeriod} from "@/lib/owner-money";
import {PageHead,Panel,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
export default async function OwnerOutlets({searchParams}:{searchParams:Promise<{from?:string;to?:string;q?:string}>}){
 await requireOwner();const p=await searchParams;const period=parsePeriod(p.from,p.to);
 const all=await ownerOutlets(period);
 const term=(p.q||"").toLocaleLowerCase("id").trim();
 const rows=all.filter(x=>x.name.toLocaleLowerCase("id").includes(term)||x.group_name.toLocaleLowerCase("id").includes(term))
 .sort((a,b)=>(Number(b.gross)-Number(b.credits))-(Number(a.gross)-Number(a.credits)));
 return <>
 <PageHead eyebrow="OWNER / ANALISIS OUTLET" title="Performa Outlet" description="Pantau seluruh outlet, nilai barang terkirim, pembayaran yang diterima, dan total piutang setiap outlet."/>
 <Panel title="Cari dan filter"><form method="get" className="form-grid">
  <label>Outlet / grup<input name="q" defaultValue={p.q||""} placeholder="RM Sidrap"/></label>
  <label>Dari<input type="date" name="from" defaultValue={period.from||""}/></label>
  <label>Sampai<input type="date" name="to" defaultValue={period.to||""}/></label>
  <button className="primary-button" type="submit">Cari</button>
 </form></Panel>
 <div className="metrics-grid">
  <section className="metric"><div className="metric-label">Total outlet terdaftar</div><strong>{all.length}</strong></section>
  <section className="metric"><div className="metric-label">Outlet dengan order periode ini</div><strong>{all.filter(x=>x.orders>0).length}</strong></section>
  <section className="metric"><div className="metric-label">Outlet belum memesan pada periode</div><strong>{all.filter(x=>x.orders===0).length}</strong></section>
  <section className="metric"><div className="metric-label">Piutang seluruh outlet</div><strong>{rupiah(all.reduce((s,x)=>s+Number(x.due),0))}</strong></section>
 </div>
 <Panel title="Performa setiap outlet" detail={rows.length+" outlet dalam pencarian"}>
  {rows.length?<div className="table-wrap"><table><thead><tr><th>Outlet</th><th>G.O</th><th>Order</th><th>Kirim</th><th>Penjualan bersih</th><th>Pembayaran masuk</th><th>Piutang seluruh waktu</th><th>Order terakhir</th></tr></thead>
  <tbody>{rows.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.group_name}</td><td>{x.orders}</td><td>{x.shipments}</td><td>{rupiah(Number(x.gross)-Number(x.credits))}</td><td>{rupiah(x.received)}</td><td>{rupiah(x.due)}</td><td>{x.last_order||"—"}</td></tr>)}</tbody></table></div>:<p className="form-hint">Tidak ada outlet yang cocok.</p>}
  <p className="form-hint">Penjualan memakai tanggal barang terkirim; pembayaran memakai tanggal uang diterima. Piutang ditampilkan sebagai saldo seluruh waktu, bukan hanya periode filter.</p>
 </Panel>
 <p><Link href="/outlets">Kelola data outlet →</Link> · <Link href="/owner/finance">Keuangan & HPP →</Link></p>
 </>;
}
