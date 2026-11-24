import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowRight,ShoppingCart,Package,ClipboardCheck,Truck,Wallet,AlertTriangle,Factory,RotateCcw} from "lucide-react";
import {requireActor} from "@/lib/access";
import {listProducts} from "@/lib/operations";
import {query} from "@/lib/db";
import {Panel,rupiah} from "@/components/ui";
import {adminAnalytics} from "@/lib/dashboard-analytics";
import {QualityBars} from "@/components/business-charts";
export const dynamic="force-dynamic";
export default async function Dashboard(){
 const actor=await requireActor();
 if(actor.role==="owner")redirect("/owner");
 const [products,orders,qc,production,complaints,financial,historical,finished,analytics]=await Promise.all([
  listProducts(),
  query<{today:number;pending:number;partial:number}>("SELECT COUNT(*) FILTER(WHERE ordered_on=(now() AT TIME ZONE 'Asia/Makassar')::date)::int AS today,COUNT(*) FILTER(WHERE status='confirmed')::int AS pending,COUNT(*) FILTER(WHERE status='partially_delivered')::int AS partial FROM customer_orders WHERE status!='cancelled'"),
  actor.role!=="marketing"?query<{count:number;qty:number}>("SELECT COUNT(*)::int AS count,COALESCE(SUM(received_qty-accepted_qty-rejected_qty),0)::int AS qty FROM coconut_batches WHERE received_qty>accepted_qty+rejected_qty"):Promise.resolve([{count:0,qty:0}]),
  actor.role!=="marketing"?query<{count:number}>("SELECT COUNT(*)::int AS count FROM coconut_batches WHERE accepted_qty>consumed_qty"):Promise.resolve([{count:0}]),
  query<{count:number}>("SELECT COUNT(*)::int AS count FROM outlet_complaints WHERE status IN('open','investigating')"),
  actor.role!=="marketing"?query<{gross:string;returns:string;paid:string}>("SELECT COALESCE((SELECT SUM(gross) FROM delivery_invoices WHERE status='issued'),0)::text AS gross,COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r JOIN delivery_invoices i ON i.delivery_id=r.delivery_id WHERE i.status='issued'),0)::text AS returns,COALESCE((SELECT SUM(p.amount) FROM delivery_payments p JOIN delivery_invoices i ON i.id=p.invoice_id WHERE i.status='issued'),0)::text AS paid"):Promise.resolve([{gross:"0",returns:"0",paid:"0"}]),
  actor.role!=="marketing"?query<{unpaid:number;sum:string}>("SELECT COUNT(*)::int unpaid,COALESCE(SUM(confirmed_due),0)::text sum FROM v_go_unpaid_current WHERE confirmed_due>0"):Promise.resolve([{unpaid:0,sum:"0"}]),
  actor.role!=="marketing"?query<{qty:number}>("SELECT COALESCE(SUM(b.quantity),0)::int qty FROM inventory_balances b JOIN products p ON p.id=b.product_id WHERE p.sku IN ('GO-MAKAN-FULL','GO-KELAPA-TAR','GO-SERUT') AND p.active=true"):Promise.resolve([{qty:0}]),
  actor.role!=="marketing"?adminAnalytics():Promise.resolve(null)
 ]);
 const low=products.filter(p=>p.stock<=p.min_stock);
 const order=orders[0]||{today:0,pending:0,partial:0};
 const summary=financial[0]||{gross:"0",returns:"0",paid:"0"};
 const due=Math.max(0,Number(summary.gross)-Number(summary.returns)-Number(summary.paid));
 const steps=[
  {name:"Order belum dikirim",value:order.pending+order.partial,detail:order.partial+" pengiriman sebagian",href:"/orders",icon:Truck},
  ...(actor.role!=="marketing"?[
   {name:"Batch menunggu QC",value:qc[0]?.count||0,detail:(qc[0]?.qty||0)+" butir belum diperiksa",href:"/qc",icon:ClipboardCheck},
   {name:"Bahan siap produksi",value:production[0]?.count||0,detail:"Batch lolos QC",href:"/production",icon:Factory}
  ]:[]),
  {name:"Komplain perlu tindakan",value:complaints[0]?.count||0,detail:"Belum ditutup",href:"/outlet-returns",icon:RotateCcw},
  {name:"Stok menipis",value:low.length,detail:"Perlu dicek atau diproduksi",href:"/products",icon:AlertTriangle},
  ...(actor.role!=="marketing"?[{name:"Stok jadi siap kirim (unit)",value:finished[0]?.qty||0,detail:"Lihat rincian per kategori dan satuan",href:"/production",icon:Package}]:[])
 ];
 return <div>
  <section className="dashboard-hero">
   <div className="dashboard-hero-copy"><p className="eyebrow">KELAPA GO · OPERASIONAL KELAPA</p>
    <h1>Pekerjaan Hari Ini</h1><p>Selamat bekerja, {actor.name.split(" ")[0]}. Selesaikan pekerjaan tanpa mencari di banyak menu.</p>
    <div className="dashboard-hero-actions"><Link href="/orders">Buat order <ArrowRight size={16}/></Link>{actor.role!=="marketing"&&<Link href="/procurement">Terima kelapa <ArrowRight size={16}/></Link>}</div>
   </div>
  </section>
  <div className="dashboard-section-header"><h2>Yang perlu ditangani</h2><p>Prioritas operasional · WITA (Palu)</p></div>
  <div className="metrics-grid">{steps.map(({name,value,detail,href,icon:Icon})=><Link href={href} className="metric" key={name} style={{display:"block",textDecoration:"none",color:"inherit"}}>
   <div className="metric-label">{name}<Icon size={19}/></div><strong>{value}</strong><span className="dashboard-stat-foot">{detail} · Buka</span>
  </Link>)}</div>
  {analytics&&<section aria-label="Monitoring operasional visual">
   <div className="kg-analytics-header"><div><h2>Monitoring Operasional 7 Hari</h2><p>Grafik dan stok aktual, diperbarui dari transaksi tercatat.</p></div><Link href="/reports" className="secondary-button">Laporan operasional →</Link></div>
   <div className="dash-columns">
    <Panel title="Produksi & Kelapa Rusak" detail="Jumlah bahan diproses dan rusak · satuan BUTIR">
     <QualityBars items={analytics.production}/>
     <div className="kg-legend"><span><i style={{background:"#2d8b65"}}/>Layak setelah proses</span><span><i style={{background:"#e8a44f"}}/>Rusak</span></div>
     <p className="form-hint" style={{padding:"0 18px 14px"}}>Grafik menunjukkan bahan diproses dikurangi rusak; bukan total stok produk jadi.</p>
    </Panel>
    <Panel title="Stok Jadi Siap Distribusi" detail="Stok sekarang dan jumlah dikirim 7 hari terakhir">
     <div className="kg-rank-list">
     {analytics.products.map(x=><div key={x.sku} className="kg-meter-row">
      <div className="kg-meter-label"><strong>{x.name}</strong><b>{x.stock.toLocaleString("id-ID")} {x.unit}</b></div>
      <div className="kg-meter-track"><div style={{width:(x.stock>0?Math.max(5,x.stock/Math.max(x.stock,x.shipped,x.threshold,1)*100):0)+"%",background:x.stock<=x.threshold?"#db9b41":"#2D8B65"}}/></div>
      <small className="form-hint">Terkirim 7 hari: {x.shipped.toLocaleString("id-ID")} {x.unit} · Batas minimum {x.threshold.toLocaleString("id-ID")} {x.unit}</small>
     </div>)}
     {analytics.products.length===0&&<p className="form-hint">Produk hasil produksi belum tersedia.</p>}
     <p className="form-hint">Satuan PCS dan BUTIR tidak digabung menjadi satu total stok.</p>
     <Link href="/production">Lihat detail produksi & stok →</Link>
     </div>
    </Panel>
   </div>
   <Panel title="Produksi vs Pengiriman per Jenis" detail="7 hari terakhir · tiap produk memakai satuannya sendiri">
    <div className="kg-rank-list">{analytics.products.map(x=><div key={x.sku} className="kg-meter-row">
     <strong style={{fontSize:13,color:"#1f5139"}}>{x.name}</strong>
     <div style={{marginTop:9}} className="kg-meter-label"><span>Hasil produksi</span><b>{x.produced.toLocaleString("id-ID")} {x.unit}</b></div>
     <div className="kg-meter-track"><div style={{width:(x.produced/Math.max(x.produced,x.shipped,1)*100)+"%",background:"#2d8b65"}}/></div>
     <div style={{marginTop:9}} className="kg-meter-label"><span>Pengiriman</span><b>{x.shipped.toLocaleString("id-ID")} {x.unit}</b></div>
     <div className="kg-meter-track"><div style={{width:(x.shipped/Math.max(x.produced,x.shipped,1)*100)+"%",background:"#d5a64c"}}/></div>
    </div>)}
    <p className="form-hint">Barang dikirim dapat berasal dari stok hari-hari sebelumnya.</p>
    </div>
   </Panel>
   {(order.pending+order.partial>0||low.length>0)&&<div className="kg-insight-list">
    {order.pending+order.partial>0&&<div className="kg-insight"><strong>{order.pending+order.partial} order butuh pengiriman</strong><p>Periksa order dan sisa barang yang belum diterima outlet. <Link href="/orders">Tindak lanjuti →</Link></p></div>}
    {low.length>0&&<div className="kg-insight"><strong>{low.length} produk mencapai batas stok</strong><p>Cek stok fisik dan rencanakan produksi sebelum mengirim pesanan.</p></div>}
   </div>}
  </section>}
  <div className="dash-columns">
   <Panel title="Aksi Cepat" detail="Alur kerja utama"><div className="quick-links">
    <Link href="/orders"><ShoppingCart size={19}/> Buat / Kirim order <ArrowRight size={16}/></Link>
    {actor.role!=="marketing"&&<Link href="/procurement"><ClipboardCheck size={19}/> Pembelian + QC <ArrowRight size={16}/></Link>}
    {actor.role!=="marketing"&&<Link href="/production"><Factory size={19}/> Catat hasil produksi <ArrowRight size={16}/></Link>}
    {actor.role!=="marketing"&&<Link href="/cash"><Wallet size={19}/> Kas kecil <ArrowRight size={16}/></Link>}
    {actor.role!=="marketing"&&<Link href="/inventory"><Package size={19}/> Inventaris <ArrowRight size={16}/></Link>}
    {actor.role!=="marketing"&&<Link href="/invoices"><Wallet size={19}/> Catat pembayaran <ArrowRight size={16}/></Link>}
    <Link href="/products"><Package size={19}/> Periksa stok <ArrowRight size={16}/></Link>
   </div></Panel>
   <Panel title="Ringkasan usaha" detail="Angka transaksi tercatat">
    <div style={{padding:"18px 22px"}}>
     <p>Order hari ini: <strong>{order.today}</strong></p>
     {actor.role!=="marketing"&&<>
      <p>Penjualan terkirim: <strong>{rupiah(summary.gross)}</strong></p>
      <p>Retur: <strong>{rupiah(summary.returns)}</strong></p>
      <p>Uang diterima: <strong>{rupiah(summary.paid)}</strong></p>
      <p>Sisa piutang: <strong>{rupiah(due)}</strong></p>
      <p>Piutang historis GO terkonfirmasi: <strong>{rupiah(historical[0]?.sum||0)}</strong></p>
      <p><Link href="/invoices/legacy">Pivot UNPAID otomatis →</Link></p>
      <p><Link href="/invoices">Lihat transaksi dan pembayaran</Link></p>
     </>}
    </div>
   </Panel>
  </div>
 </div>;
}
