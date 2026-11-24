import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {PageHead,Panel,rupiah} from "@/components/ui";
import {ownerMoney,parsePeriod} from "@/lib/owner-money";
import {ownerOutlets} from "@/lib/owner-outlets";
import {ownerOperations} from "@/lib/owner-operations";
import {ownerCostReadiness} from "@/lib/owner-hpp";
import {query} from "@/lib/db";
import {ownerAnalytics} from "@/lib/dashboard-analytics";
import {TrendChart,CashMovement,OutletRanking} from "@/components/business-charts";
export const dynamic="force-dynamic";
const currentMonth=()=>{
 const d=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 return d.slice(0,7)+"-01";
};
export default async function OwnerHome({searchParams}:{searchParams:Promise<{from?:string;to?:string;all?:string;view?:string;range?:string}>}){
 await requireOwner();
 const p=await searchParams;
 const period=p.all==="1"?parsePeriod():parsePeriod(p.from||currentMonth(),p.to);
 const source=p.view==="live"?"live" as const:"legacy" as const;
 const range=p.range==="7"?7:p.range==="30"?30:90;
 const custom=p.from&&p.to&&period.from&&period.to?{from:period.from,to:period.to}:undefined;
 const periodLabel=custom?custom.from+" s.d. "+custom.to:range+" hari terakhir";
 const preserve=custom?"from="+custom.from+"&to="+custom.to:"range="+range;
 const [money,outlets,operations,cost,go,reconciliation,analytics]=await Promise.all([
  ownerMoney(period),ownerOutlets(period),ownerOperations(),ownerCostReadiness(),
  query<{receipts:number;gross:string;unpaid:string;cash:string;assets:number;unpriced_products:number}>(
   "SELECT (SELECT COUNT(*)::int FROM legacy_receipts) receipts,(SELECT COALESCE(SUM(gross-return_value),0)::text FROM legacy_receipts) gross,(SELECT COALESCE(SUM(confirmed_due),0)::text FROM v_go_unpaid_current) unpaid,(SELECT recorded_balance::text FROM legacy_cash_entries WHERE recorded_balance IS NOT NULL ORDER BY source_row DESC LIMIT 1) cash,(SELECT COUNT(*)::int FROM inventory_assets) assets,(SELECT COUNT(*)::int FROM products WHERE active=true AND category<>'Afkir' AND price<=0) unpriced_products"),
  query<{receipt_review:number;cash_review:number;stock_review:number}>(
   "SELECT (SELECT COUNT(*)::int FROM legacy_receipts WHERE status='PARTIAL' OR notes LIKE 'Berdasarkan Excel terbaru KWITANSI%' OR notes LIKE 'Perlu verifikasi selisih kas:%') AS receipt_review, (SELECT COUNT(*)::int FROM legacy_source_rows s WHERE s.source_sheet='KAS KECIL' AND s.source_row BETWEEN 1388 AND 1428 AND NOT EXISTS(SELECT 1 FROM legacy_cash_entries c WHERE c.source_row=s.source_row)) AS cash_review, (SELECT COUNT(*)::int FROM legacy_stock_snapshots WHERE status='PENDING_RECONCILIATION') AS stock_review")

 , ownerAnalytics(source,range,custom)
 ]);
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
 {(reconciliation[0]?.receipt_review||reconciliation[0]?.cash_review||reconciliation[0]?.stock_review)?<Panel title="Perlu rekonsiliasi data Excel" detail="Tidak ada transaksi yang digandakan atau saldo yang ditebak">
  <div style={{padding:18}}>
   <p><strong>{reconciliation[0]?.receipt_review||0}</strong> kuitansi perlu pemeriksaan nominal, pembayaran parsial, atau selisih kas.</p>
   <p><strong>{reconciliation[0]?.cash_review||0}</strong> baris kas masih disimpan sebagai sumber audit dan belum dibukukan karena arah debit/kredit tidak konsisten.</p>
   <p><strong>{reconciliation[0]?.stock_review||0}</strong> snapshot stok historis belum terverifikasi per jenis/grade. Stok aktif tidak otomatis ditambah.</p>
   <p className="form-hint">Saldo kas historis bukan saldo final sebelum rekonsiliasi selesai. Periksa rincian pada laporan historis dan kas kecil.</p>
   <p><Link href="/owner/legacy">Periksa laporan historis →</Link> · <Link href="/cash">Periksa kas →</Link> · <Link href="/products">Periksa stok →</Link></p>
  </div>
 </Panel>:null}
 <div className="metrics-grid">{cards.map(c=><Link key={c.title} href={c.href} className="metric" style={{textDecoration:"none",color:"inherit",display:"block"}}>
  <div className="metric-label">{c.title}</div><strong>{c.value}</strong><span className="dashboard-stat-foot">Lihat detail →</span>
 </Link>)}</div>
 <div className="kg-analytics-header">
  <div><h2>Analitik & Insight Bisnis</h2><p>Grafik dari transaksi tercatat. Arsip Excel dan operasional baru tidak digabung.</p></div>
  <div className="kg-filter-chips" aria-label="Pilih sumber data">
   <Link href={"/owner?view=legacy&"+preserve} aria-current={source==="legacy"?"true":undefined}>Data Historis</Link>
   <Link href={"/owner?view=live&"+preserve} aria-current={source==="live"?"true":undefined}>Operasional Baru</Link>
  </div>
 </div>
 <Panel title={"Tren Penjualan Bersih — "+(source==="legacy"?"Historis KELAPA GO":"Operasional Baru")} detail={"Sumber dipisahkan • "+periodLabel+" • sesuai tanggal pencatatan"}>
  <div className="kg-filter-chips" style={{padding:"16px 18px 0"}}>
   {[7,30,90].map(n=><Link key={n} href={"/owner?view="+source+"&range="+n} aria-current={!custom&&range===n?"true":undefined}>{n} hari</Link>)}
   {custom&&<span style={{padding:"8px 12px",fontSize:12,background:"#165639",color:"#fff",borderRadius:10}}>Periode khusus: {custom.from} – {custom.to}</span>}
  </div>
  <TrendChart points={analytics.points} empty={source==="legacy"?"Tidak ada kuitansi historis pada rentang ini.":"Belum ada penjualan terkirim dalam operasional KELAPA GO yang baru."}/>
  <div className="kg-legend"><span><i style={{background:"#258658"}}/> Penjualan bersih setelah retur</span><span>Sumber: {source==="legacy"?"arsip kuitansi (sebagian perlu audit)":"invoice pengiriman baru"}</span></div>
 </Panel>
 <div className="dash-columns">
  <Panel title="Insight Otomatis" detail="Berdasarkan data tercatat dan catatan audit">
   <div className="kg-insight-list">
    {analytics.previous>0?<div className="kg-insight"><strong>{analytics.current>=analytics.previous?"↑ Penjualan meningkat":"↓ Penjualan menurun"} {Math.abs((analytics.current/analytics.previous-1)*100).toLocaleString("id-ID",{maximumFractionDigits:1})}%</strong><p>Perbandingan dengan {analytics.days} hari sebelumnya. Saat ini {rupiah(analytics.current)}, sebelumnya {rupiah(analytics.previous)}.</p></div>:<div className="kg-insight"><strong>{analytics.current>0?"Ada penjualan tercatat pada periode ini":"Belum ada penjualan pada periode ini"}</strong><p>{analytics.current>0?"Periode pembanding sebelumnya belum memiliki transaksi.":"Tunggu transaksi riil sebelum menyimpulkan tren penjualan."}</p></div>}
    {analytics.rankings[0]?<div className="kg-insight"><strong>Outlet terbesar: {analytics.rankings[0].name}</strong><p>Kontribusi {rupiah(analytics.rankings[0].value)} dalam {analytics.days} hari terakhir.</p></div>:null}
    {operations.low_stock>0?<div className="kg-insight"><strong>{operations.low_stock} produk di bawah batas stok</strong><p>Periksa kebutuhan produksi dan pengiriman sebelum menerima order baru.</p></div>:null}
    <div className="dash-columns">
  <Panel title="Peringatan & pekerjaan penting" detail="Diperbarui dari data transaksi">
   <div className="simple-list">{alerts.map(a=><div key={a.title}><span><strong>{a.title}</strong><small>{a.value} perlu perhatian</small></span><Link href={a.href}>Periksa →</Link></div>)}</div>
  </Panel>
  <Panel title="Top 5 Outlet" detail={(source==="legacy"?"Historis KELAPA GO":"Operasional Baru")+" · "+periodLabel}>
   <OutletRanking items={analytics.rankings}/>
   <p className="form-hint" style={{padding:"0 20px 15px"}}><Link href={source==="legacy"?"/owner/legacy":"/owner/outlets"}>Lihat rincian outlet →</Link></p>
  </Panel>
 </div>
 {go[0]?.unpriced_products>0?<div className="kg-insight"><strong>{go[0].unpriced_products} harga produk belum disetel</strong><p>Harga Rp0 memblokir order baru. <Link href="/products">Tetapkan harga →</Link></p></div>:null}
    <div className="kg-insight"><strong>Piutang historis {rupiah(go[0]?.unpaid||0)}</strong><p>Pembayaran tunai historis yang dicatat baru tetap berada di Kas Kecil; tidak ditambahkan lagi sebagai omzet periode ini.</p></div>
   </div>
  </Panel>
  <Panel title="Arus Kas Kecil" detail={periodLabel+" · ledger baru, tidak termasuk arsip Excel"}>
   <CashMovement incoming={analytics.cashIn} outgoing={analytics.cashOut}/>
   <p className="form-hint" style={{padding:"0 22px"}}>Ini adalah arus uang tercatat, bukan saldo fisik. Saldo awal harus dikonfirmasi Owner.</p>
   <p style={{padding:"0 22px 14px"}}><Link href="/cash">Lihat buku kas →</Link></p>
  </Panel>
 </div>
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
