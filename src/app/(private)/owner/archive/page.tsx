import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {archiveHistory,validateArchiveYear} from "@/lib/annual-archive";
import {query} from "@/lib/db";
import {ArchiveVerifier} from "@/components/archive-verifier";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
type Blockers={open_orders:number;outstanding:string;pending_refunds:number;active_batches:number};
export default async function OwnerArchive({searchParams}:{searchParams:Promise<{year?:string;success?:string;error?:string}>}){
 await requireOwner();
 const p=await searchParams;
 const current=Number(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Makassar",year:"numeric"}).format(new Date()));
 const year=Number(p.year||current);
 validateArchiveYear(year);
 const [history,blockers]=await Promise.all([
  archiveHistory(),
  query<Blockers>(`SELECT
   (SELECT COUNT(*)::int FROM customer_orders o WHERE o.ordered_on>=make_date($1,1,1) AND o.ordered_on<make_date($1+1,1,1) AND o.status IN('confirmed','partially_delivered')) AS open_orders,
   (SELECT GREATEST(0,COALESCE(SUM(i.gross),0)-COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r JOIN delivery_notes d2 ON d2.id=r.delivery_id JOIN customer_orders o2 ON o2.id=d2.order_id WHERE o2.ordered_on>=make_date($1,1,1) AND o2.ordered_on<make_date($1+1,1,1)),0)
    -COALESCE((SELECT SUM(p.amount) FROM delivery_payments p JOIN delivery_invoices i2 ON i2.id=p.invoice_id JOIN delivery_notes d3 ON d3.id=i2.delivery_id JOIN customer_orders o3 ON o3.id=d3.order_id WHERE o3.ordered_on>=make_date($1,1,1) AND o3.ordered_on<make_date($1+1,1,1)),0))::text
    FROM delivery_invoices i JOIN delivery_notes d ON d.id=i.delivery_id JOIN customer_orders o ON o.id=d.order_id WHERE o.ordered_on>=make_date($1,1,1) AND o.ordered_on<make_date($1+1,1,1) AND i.status='issued') AS outstanding,
   (SELECT COUNT(*)::int FROM delivery_refund_obligations r JOIN delivery_notes d ON d.id=r.delivery_id JOIN customer_orders o ON o.id=d.order_id WHERE o.ordered_on>=make_date($1,1,1) AND o.ordered_on<make_date($1+1,1,1) AND r.status='pending') AS pending_refunds,
   (SELECT COUNT(*)::int FROM coconut_batches b JOIN coconut_receipts r ON r.id=b.receipt_id WHERE (r.received_at AT TIME ZONE 'Asia/Makassar')::date>=make_date($1,1,1) AND (r.received_at AT TIME ZONE 'Asia/Makassar')::date<make_date($1+1,1,1) AND (b.received_qty>b.accepted_qty+b.rejected_qty OR b.accepted_qty>b.consumed_qty)) AS active_batches`,[year])
 ]);
 const b=blockers[0],blocked=b.open_orders>0||Number(b.outstanding)>0||b.pending_refunds>0||b.active_batches>0;
 const years=Array.from({length:Math.min(current-2023,12)},(_,i)=>current-i);
 return <>
  <PageHead eyebrow="OWNER / ARSIP & RETENSI" title="Arsip Data Tahunan" description="Unduh data dalam ZIP (JSON dan CSV), simpan salinan eksternal, dan verifikasi keutuhan arsip sebelum mempertimbangkan pembersihan."/>
  <Notice success={p.success} error={p.error}/>
  <Panel title="Pilih tahun data" detail="Ekspor tidak menghapus atau mengubah transaksi">
   <form method="get" className="form-grid"><label>Tahun<select name="year" defaultValue={String(year)}>{years.map(y=><option key={y} value={y}>{y}{y===current?" (berjalan)":""}</option>)}</select></label>
    <button className="primary-button" type="submit">Lihat Kondisi Tahun</button>
   </form>
   <div style={{padding:20}}>
    <p><Link className="primary-button" href={"/api/owner/archive/"+year}>Unduh ZIP Arsip {year}</Link></p>
    <p className="form-hint">Arsip tahun berjalan adalah snapshot sementara. Sebelum menghapus data historis, unduh ulang sesudah semua transaksi terkait selesai dan cocokkan arsip dengan buku fisik.</p>
   </div>
  </Panel>
  <Panel title={"Pemeriksaan tahun "+year} detail={blocked?"Ada transaksi/saldo yang masih berjalan":"Tidak ada hambatan terdeteksi pada pemeriksaan dasar"}>
   <div className="metrics-grid">
    <section className="metric"><div className="metric-label">Order belum selesai</div><strong>{b.open_orders}</strong></section>
    <section className="metric"><div className="metric-label">Piutang belum lunas</div><strong>{rupiah(b.outstanding)}</strong></section>
    <section className="metric"><div className="metric-label">Refund belum dibayar</div><strong>{b.pending_refunds}</strong></section>
    <section className="metric"><div className="metric-label">Batch yang masih berjalan</div><strong>{b.active_batches}</strong></section>
   </div>
   <p className="form-hint">Pemeriksaan ini bersifat awal. Nomor kwitansi, saldo stok, nilai HPP, dan relasi antartahun tetap harus diaudit sebelum pembersihan.</p>
  </Panel>
  <Panel title="Arsip yang pernah diunduh" detail="Checksum SHA-256 dari file ZIP yang dibuat server">
   {history.length?<div className="table-wrap"><table><thead><tr><th>Tahun</th><th>Tanggal ekspor</th><th>Ukuran</th><th>Checksum</th><th>Verifikasi</th></tr></thead><tbody>{history.map(x=><tr key={x.id}><td>{x.archive_year}</td><td>{new Date(x.exported_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td><td>{(Number(x.byte_size)/1024/1024).toFixed(2)} MB</td><td className="mono">{x.sha256.slice(0,18)}…</td><td>{x.verified_at?"Terverifikasi":"Belum diverifikasi"}</td></tr>)}</tbody></table></div>:<p className="form-hint">Belum ada arsip yang diunduh.</p>}
  </Panel>
  <Panel title="Verifikasi file yang tersimpan" detail="Pemeriksaan dilakukan di browser Owner; file tidak perlu diunggah ke server">
   <ArchiveVerifier archives={history.map(x=>({id:x.id,year:x.archive_year,sha256:x.sha256,verified:!!x.verified_at}))}/>
  </Panel>
  <Panel title="Pembersihan data lama">
   <div style={{padding:20}}>
    <p>Penghapusan fisik transaksi belum diaktifkan. Fitur ini sengaja dikunci sampai arsip terverifikasi, transaksi antarperiode direkonsiliasi, saldo awal dibawa ke tahun berikutnya, dan prosedur pemulihan diuji.</p>
    <p className="form-hint">Penghapusan langsung tabel transaksi dapat memutus kaitan stok, pembayaran, retur, dan nomor kwitansi. Arsip ZIP di atas bukan pengganti backup PostgreSQL penuh.</p>
   </div>
  </Panel>
 </>;
}
