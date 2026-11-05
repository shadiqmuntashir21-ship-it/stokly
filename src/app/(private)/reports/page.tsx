import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,rupiah,Empty} from "@/components/ui";
import Link from "next/link";
export const dynamic="force-dynamic";
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;
export default async function Reports({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 await requireActor(["owner","admin"]);
 const p=await searchParams;
 const from=validDate(p.from||"");
 const to=validDate(p.to||"");
 const dates=[from,to];
 const [outlets,legacy,receipts,moves]=await Promise.all([
  query<{day:string;orders:number;gross:string;credit:string;paid:string}>(
   "SELECT d.delivered_on::text AS day,COUNT(DISTINCT d.order_id)::int AS orders,COALESCE(SUM(i.gross),0)::text AS gross,COALESCE(SUM((SELECT COALESCE(SUM(r.credit_amount),0) FROM delivery_returns r WHERE r.delivery_id=d.id)),0)::text AS credit,COALESCE(SUM((SELECT COALESCE(SUM(pay.amount),0) FROM delivery_payments pay WHERE pay.invoice_id=i.id)),0)::text AS paid FROM delivery_notes d JOIN delivery_invoices i ON i.delivery_id=d.id WHERE i.status='issued' AND ($1::date IS NULL OR d.delivered_on>=$1::date) AND ($2::date IS NULL OR d.delivered_on<=$2::date) GROUP BY d.delivered_on ORDER BY d.delivered_on DESC LIMIT 90",dates),
  query<{day:string;count:number;gross:string}>(
   "SELECT (s.created_at AT TIME ZONE 'Asia/Makassar')::date::text AS day,COUNT(*)::int AS count,COALESCE(SUM(s.total),0)::text AS gross FROM sales s WHERE s.status='completed' AND ($1::date IS NULL OR (s.created_at AT TIME ZONE 'Asia/Makassar')::date>=$1::date) AND ($2::date IS NULL OR (s.created_at AT TIME ZONE 'Asia/Makassar')::date<=$2::date) GROUP BY 1 ORDER BY 1 DESC LIMIT 90",dates),
  query<{gross:string;credit:string;paid:string}>(
   "SELECT COALESCE((SELECT SUM(i.gross) FROM delivery_invoices i JOIN delivery_notes d ON d.id=i.delivery_id WHERE i.status='issued' AND ($1::date IS NULL OR d.delivered_on>=$1::date) AND ($2::date IS NULL OR d.delivered_on<=$2::date)),0)::text AS gross,COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r JOIN delivery_notes d ON d.id=r.delivery_id WHERE ($1::date IS NULL OR d.delivered_on>=$1::date) AND ($2::date IS NULL OR d.delivered_on<=$2::date)),0)::text AS credit,COALESCE((SELECT SUM(p.amount) FROM delivery_payments p WHERE ($1::date IS NULL OR (p.paid_at AT TIME ZONE 'Asia/Makassar')::date>=$1::date) AND ($2::date IS NULL OR (p.paid_at AT TIME ZONE 'Asia/Makassar')::date<=$2::date)),0)::text AS paid",dates),
  query<{name:string;quantity_delta:number;source_type:string;created_at:Date}>(
   "SELECT p.name,m.quantity_delta,m.source_type,m.created_at FROM stock_movements m JOIN products p ON p.id=m.product_id WHERE ($1::date IS NULL OR (m.created_at AT TIME ZONE 'Asia/Makassar')::date>=$1::date) AND ($2::date IS NULL OR (m.created_at AT TIME ZONE 'Asia/Makassar')::date<=$2::date) ORDER BY m.created_at DESC LIMIT 80",dates)
 ]);
 const gross=Number(receipts[0]?.gross||0),credit=Number(receipts[0]?.credit||0),paid=Number(receipts[0]?.paid||0);
 return <><PageHead eyebrow="LAPORAN / TERPADU" title="Laporan Usaha" description="Pisahkan penjualan outlet STOKLY V4 dan transaksi kasir lama. Semua angka bisa ditelusuri."/>
 <Panel title="Filter periode">
  <form method="get" className="form-grid"><label>Dari tanggal<input type="date" name="from" defaultValue={from||""}/></label><label>Sampai tanggal<input type="date" name="to" defaultValue={to||""}/></label><button className="primary-button" type="submit">Terapkan Filter</button></form>
  <p className="form-hint">Tanggal mengikuti WITA (Palu). Retur dikaitkan ke pengiriman asal; uang diterima mengikuti tanggal pembayaran aktual.</p>
 </Panel>
 <div className="metrics-grid">
  <section className="metric"><div className="metric-label">Penjualan outlet terkirim</div><strong>{rupiah(gross)}</strong></section>
  <section className="metric"><div className="metric-label">Retur outlet</div><strong>{rupiah(credit)}</strong></section>
  <section className="metric"><div className="metric-label">Penjualan outlet bersih</div><strong>{rupiah(gross-credit)}</strong></section>
  <section className="metric"><div className="metric-label">Pembayaran diterima periode</div><strong>{rupiah(paid)}</strong></section>
 </div>
 <Panel title="Penjualan per tanggal pengiriman" detail="Berdasarkan barang yang benar-benar telah dikirim">
  {!outlets.length?<Empty label="pengiriman outlet"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Order</th><th>Amount</th><th>Retur</th><th>Nilai bersih</th><th>Bayar atas nota</th></tr></thead><tbody>
  {outlets.map(r=><tr key={r.day}><td>{r.day}</td><td>{r.orders}</td><td>{rupiah(r.gross)}</td><td>{rupiah(r.credit)}</td><td>{rupiah(Number(r.gross)-Number(r.credit))}</td><td>{rupiah(r.paid)}</td></tr>)}
  </tbody></table></div>}
  <p className="form-hint"><Link href="/invoices">Buka rekap semua kwitansi, filter outlet, atau unduh CSV →</Link></p>
 </Panel>
 <Panel title="Kasir lama (terpisah)" detail="Tidak dijumlah otomatis ke omzet outlet untuk menghindari pencatatan ganda">
  {!legacy.length?<Empty label="transaksi kasir lama"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Transaksi</th><th>Bruto</th></tr></thead><tbody>
  {legacy.map(r=><tr key={r.day}><td>{r.day}</td><td>{r.count}</td><td>{rupiah(r.gross)}</td></tr>)}
  </tbody></table></div>}
 </Panel>
 <Panel title="Mutasi stok terbaru">
  {!moves.length?<Empty label="mutasi stok"/>:<div className="table-wrap"><table><thead><tr><th>Waktu WITA</th><th>Produk</th><th>Asal</th><th>Perubahan</th></tr></thead><tbody>{moves.map((m,i)=><tr key={i}><td>{new Date(m.created_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td><td>{m.name}</td><td>{m.source_type}</td><td>{m.quantity_delta>0?"+":""}{m.quantity_delta}</td></tr>)}</tbody></table></div>}
 </Panel>
 </>;
}
