import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {PageHead,Panel,rupiah} from "@/components/ui";
import {ownerMoney,parsePeriod} from "@/lib/owner-money";
import {ownerOutlets} from "@/lib/owner-outlets";
import {ownerOperations} from "@/lib/owner-operations";
import {ownerCostReadiness} from "@/lib/owner-hpp";
import {query} from "@/lib/db";
export const dynamic="force-dynamic";
type Day={day:string;gross:string;credit:string};
const currentMonth=()=>{
 const d=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 return d.slice(0,7)+"-01";
};
export default async function OwnerHome({searchParams}:{searchParams:Promise<{from?:string;to?:string;all?:string}>}){
 await requireOwner();
 const p=await searchParams;
 const period=p.all==="1"?parsePeriod():parsePeriod(p.from||currentMonth(),p.to);
 const [money,outlets,operations,cost,days,go]=await Promise.all([
  ownerMoney(period),ownerOutlets(period),ownerOperations(),ownerCostReadiness(),
  query<Day>(`SELECT d.delivered_on::text AS day,SUM(i.gross)::text AS gross,
    SUM(COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0))::text AS credit
    FROM delivery_notes d JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued'
    WHERE ($1::date IS NULL OR d.delivered_on>=$1) AND ($2::date IS NULL OR d.delivered_on<=$2)
    GROUP BY d.delivered_on ORDER BY d.delivered_on DESC LIMIT 14`,[period.from,period.to]),
  query<{receipts:number;gross:string;unpaid:string;cash:string;assets:number;unpriced_products:number}>(
   "SELECT (SELECT COUNT(*)::int FROM legacy_receipts) receipts,(SELECT COALESCE(SUM(gross-return_value),0)::text FROM legacy_receipts) gross,(SELECT COALESCE(SUM(confirmed_due),0)::text FROM v_go_unpaid_current) unpaid,(SELECT recorded_balance::text FROM legacy_cash_entries WHERE recorded_balance IS NOT NULL ORDER BY source_row DESC LIMIT 1) cash,(SELECT COUNT(*)::int FROM inventory_assets) assets,(SELECT COUNT(*)::int FROM products WHERE active=true AND category<>'Afkir' AND price<=0) unpriced_products")
 ]);
 const ranking=[...outlets].sort((a,b)=>(Number(b.gross)-Number(b.credits))-(Number(a.gross)-Number(a.credits))).slice(0,5);
 const max=Math.max(1,...days.map(d=>Math.max(0,Number(d.gross)-Number(d.credit))));
 const cards=[
  {title:"Penjualan outlet bersih",value:rupiah(Number(money.gross)-Number(money.returned)),href:"/owner/finance"},
  {title:"Pembayaran masuk periode",value:rupiah(money.payments),href:"/owner/finance"},
  {title:"Sisa piutang seluruh periode",value:rupiah(money.outstanding),href:"/owner/outlets"},
  {title:"Biaya tercatat periode",value:rupiah(money.expenses),href:"/owner/finance"},
  {title:"Order periode terpilih",value:String(money.orders),href:"/owner/outlets"},
  {title:"Outlet aktif",value:String(outlets.filter(x=>x.orders>0).length)+" / "+outlets.length,href:"/owner/outlets"}
 ];
 const alerts=[
  {title:"Order menunggu pengiriman",value:operations.open_orders+operations.partial_orders,href:"/orders"},
  {title:"Batch belum QC",value:operations.uninspected_batches,href:"/qc"},
  {title:"Stok menipis",value:operations.low_stock,href:"/products"},
  {title:"Komplain aktif",value:operations.open_complaints,href:"/outlet-returns"},
  {title:"Refund perlu diselesaikan",value:money.refund_pending_count,href:"/invoices"},
  {title:"Produksi belum selesai HPP",value:cost.incomplete_runs,href:"/costing"}
 ];
 return <>
 <PageHead eyebrow="OWNER / BUSINESS CONTROL CENTER" title="Beranda Bisnis" description="Pantau penjualan, keuangan, outlet, dan pekerjaan prioritas. Owner tidak perlu membuka setiap form operasional."/>
 <Panel title="Periode laporan" detail="Saldo piutang selalu menunjukkan saldo seluruh waktu">
  <form method="get" className="form-grid">
   <label>Dari tanggal<input type="date" name="from" defaultValue={period.from||""}/></label>
   <label>Sampai tanggal<input type="date" name="to" defaultValue={period.to||""}/></label>
   <button className="primary-button" type="submit">Terapkan</button>
   <Link href="/owner?all=1">Lihat seluruh waktu</Link>
  </form>
 </Panel>
 <div className="metrics-grid">{cards.map(c=><Link key={c.title} href={c.href} className="metric" style={{textDecoration:"none",color:"inherit",display:"block"}}>
  <div className="metric-label">{c.title}</div><strong>{c.value}</strong><span className="dashboard-stat-foot">Lihat detail →</span>
 </Link>)}</div>
 <div className="dash-columns">
  <Panel title="Peringatan & pekerjaan penting" detail="Diperbarui dari data transaksi">
   <div className="simple-list">{alerts.map(a=><div key={a.title}><span><strong>{a.title}</strong><small>{a.value} perlu perhatian</small></span><Link href={a.href}>Periksa →</Link></div>)}</div>
  </Panel>
  <Panel title="Outlet dengan pembelian tertinggi" detail="Berdasarkan nilai barang terkirim bersih">
   <div className="simple-list">{ranking.map(x=><div key={x.id}><span><strong>{x.name}</strong><small>{x.shipments} pengiriman · piutang {rupiah(x.due)}</small></span><span>{rupiah(Number(x.gross)-Number(x.credits))}</span></div>)}</div>
   <p className="form-hint"><Link href="/owner/outlets">Buka analisis seluruh outlet →</Link></p>
  </Panel>
 </div>
 <Panel title="Tren penjualan bersih per hari" detail="14 hari bertransaksi terakhir dalam periode">
  <div style={{padding:20}}>
   {days.length?days.slice().reverse().map(d=>{
    const net=Math.max(0,Number(d.gross)-Number(d.credit));
    return <div key={d.day} style={{display:"grid",gridTemplateColumns:"95px minmax(0,1fr) 130px",alignItems:"center",gap:10,marginBottom:11}}>
     <span className="small-muted">{d.day.slice(5)}</span>
     <div style={{height:12,borderRadius:8,background:"#eef3e9",overflow:"hidden"}}><div style={{height:"100%",width:(net/max*100)+"%",background:"#1c6047",borderRadius:8}}/></div>
     <span style={{textAlign:"right"}}>{rupiah(net)}</span>
    </div>;
   }):<p className="form-hint">Belum ada penjualan terkirim pada periode yang dipilih.</p>}
  </div>
 </Panel>
 {go[0]?.unpriced_products>0&&<Panel title="Harga jual masih perlu ditetapkan">
   <div style={{padding:18}}><p><strong>{go[0].unpriced_products} produk</strong> belum mempunyai harga jual aktif. Data spreadsheet tidak cukup untuk menentukan harga setiap grade hasil produksi secara pasti.</p>
   <p className="form-hint">Silakan atur harga di Master Produk & Stok terlebih dahulu. Nota penjualan baru dengan harga nol tidak diizinkan.</p>
   <p><Link href="/products">Atur harga jual produk →</Link></p></div>
 </Panel>}
 <Panel title="Data awal KELAPA GO — ringkasan historis (terpisah)">
  <div className="metrics-grid">
   <section className="metric"><div className="metric-label">Kuitansi historis</div><strong>{go[0]?.receipts||0}</strong></section>
   <section className="metric"><div className="metric-label">Penjualan bersih historis</div><strong>{rupiah(go[0]?.gross||0)}</strong></section>
   <section className="metric"><div className="metric-label">Piutang historis pasti</div><strong>{rupiah(go[0]?.unpaid||0)}</strong></section>
   <section className="metric"><div className="metric-label">Jenis inventaris</div><strong>{go[0]?.assets||0}</strong></section>
  </div>
  <p className="form-hint">Angka historis tidak digandakan ke transaksi baru. Saldo kas historis tertulis {rupiah(go[0]?.cash||0)} belum diaudit.</p>
  <p><Link href="/owner/legacy">Pivot UNPAID, rekap outlet & kas otomatis →</Link> · <Link href="/cash">Kas Kecil →</Link> · <Link href="/inventory">Inventaris →</Link></p>
 </Panel>
 <Panel title="Keuangan & HPP">
  <div style={{padding:20}}>
   <p>HPP produksi selesai: <strong>{cost.finished_runs} dari {cost.production_runs} proses</strong>.</p>
   <p className="form-hint">Penjualan bersih bukan laba bersih. HPP barang terjual baru boleh menjadi dasar laporan laba apabila pergerakan biaya persediaan sudah lengkap.</p>
   <p><Link href="/owner/finance">Keuangan, HPP dan margin →</Link> · <Link href="/owner/settings">Pusat Pengaturan Owner →</Link></p>
  </div>
 </Panel>
 </>;
}
