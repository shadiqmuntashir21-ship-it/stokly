import {requireOwner} from "@/lib/access";
import {query} from "@/lib/db";
import {getDailySummary,dailyCloseouts} from "@/lib/daily-closeout";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {closeDayAction} from "./actions";
export const dynamic="force-dynamic";
export default async function CloseDay({searchParams}:{searchParams:Promise<{date?:string;success?:string;error?:string}>}){
 await requireOwner();
 const p=await searchParams;
 const today=(await query<{today:string}>("SELECT (now() AT TIME ZONE 'Asia/Makassar')::date::text AS today"))[0].today;
 const date=/^\d{4}-\d{2}-\d{2}$/.test(p.date||"")?p.date!:today;
 const [summary,history]=await Promise.all([getDailySummary(date),dailyCloseouts()]);
 const closed=history.find(h=>h.business_date===date);
 const changed=!!closed&&(["orders","shipped","received","received_cash","expenses","stock_adjustments"] as const).some(k=>Number(closed.summary[k])!==Number(summary[k]));
 return <><PageHead eyebrow="OWNER / MONITORING" title="Penutupan Hari" description="Periksa transaksi harian, uang masuk, biaya, dan koreksi stok sebelum mengunci ringkasan hari."/><Notice success={p.success} error={p.error}/>
 <Panel title="Pilih tanggal (WITA)"><form method="get" className="form-grid"><label>Tanggal<input type="date" name="date" defaultValue={date} max={today} required/></label><button className="primary-button" type="submit">Lihat Ringkasan</button></form></Panel>
 <div className="metrics-grid">
  <section className="metric"><div className="metric-label">Order dibuat</div><strong>{summary.orders}</strong></section>
  <section className="metric"><div className="metric-label">Penjualan terkirim</div><strong>{rupiah(summary.shipped)}</strong></section>
  <section className="metric"><div className="metric-label">Pembayaran masuk</div><strong>{rupiah(summary.received)}</strong></section>
  <section className="metric"><div className="metric-label">Tunai diterima</div><strong>{rupiah(summary.received_cash)}</strong></section>
  <section className="metric"><div className="metric-label">Biaya operasional</div><strong>{rupiah(summary.expenses)}</strong></section>
  <section className="metric"><div className="metric-label">Penyesuaian stok</div><strong>{summary.stock_adjustments}</strong></section>
 </div>
 <Panel title={closed?"Tanggal sudah ditutup":"Konfirmasi penutupan hari"}>
  {closed?<p className={changed?"form-error":"form-hint"}>{changed?"Ada perbedaan dengan snapshot penutupan. Periksa transaksi susulan sebelum rekonsiliasi manual.":"Ringkasan hari ini sudah disimpan sebagai snapshot."}</p>:
   <form action={closeDayAction} className="form-grid"><input name="date" type="hidden" value={date}/>
    <label className="wide">Catatan penutupan<input name="note" maxLength={400} placeholder="Contoh: semua bukti pembayaran sudah dicocokkan"/></label>
    <SubmitButton className="primary-button">Simpan Penutupan Hari</SubmitButton>
   </form>}
  <p className="form-hint">Ringkasan disimpan tanpa memblokir transaksi yang datang terlambat. Pembayaran masuk dan nilai terkirim adalah angka berbeda; angka ini bukan laba bersih.</p>
 </Panel>
 <Panel title="Riwayat Penutupan">
  {!history.length?<p className="form-hint">Belum ada hari yang ditutup.</p>:
  <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Order</th><th>Pembayaran masuk</th><th>Penutupan</th><th>Catatan</th></tr></thead><tbody>
   {history.map(h=><tr key={h.business_date}><td>{h.business_date}</td><td>{h.summary.orders}</td><td>{rupiah(h.summary.received)}</td><td>{new Date(h.closed_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td><td>{h.note||"—"}</td></tr>)}
  </tbody></table></div>}
 </Panel></>;
}
