import {randomUUID} from "node:crypto";
import Link from "next/link";
import {requireActor} from "@/lib/access";
import {legacyReceiptsSummary} from "@/lib/legacy-payments";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {legacyPaymentAction,legacyBalanceReviewAction} from "./actions";
import {RupiahField} from "@/components/rupiah-field";
import {query} from "@/lib/db";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function LegacyReceipts({searchParams}:{searchParams:Promise<{success?:string;error?:string;number?:string}>}){
 await requireActor(["owner","admin"]);
 const [data,p,reviews]=await Promise.all([legacyReceiptsSummary(),searchParams,query<{document_number:string;new_due:string;reason:string;created_at:string;created_by:string}>("SELECT document_number,new_due::text,reason,(created_at AT TIME ZONE 'Asia/Makassar')::text AS created_at,created_by FROM legacy_receipt_balance_reviews ORDER BY created_at DESC LIMIT 30")]);
 const chosen=data.unpaid.find(x=>x.document_number===p.number&&!x.needs_reconciliation&&Number(x.confirmed_due)>0);
 const review=data.unpaid.find(x=>x.document_number===p.number);
 return <>
  <PageHead eyebrow="KWITANSI / DATA AWAL" title="Piutang & Nota Historis KELAPA GO" description="Rekap otomatis dari status pembayaran nota lama. Bukan transaksi baru. Tidak menggandakan order atau pengiriman di KELAPA GO."/>
  <Notice success={p.success} error={p.error}/>
  <div className="metrics-grid">
   <section className="metric"><div className="metric-label">Kwitansi historis</div><strong>{data.stat.receipts}</strong></section>
   <section className="metric"><div className="metric-label">Piutang terkonfirmasi</div><strong>{rupiah(data.stat.unpaid_amount)}</strong></section>
   <section className="metric"><div className="metric-label">Nota belum lunas</div><strong>{data.stat.unpaid_count}</strong></section>
   <section className="metric"><div className="metric-label">Perlu cek status</div><strong>{data.stat.review}</strong></section>
  </div>
  {chosen&&<Panel title={"Bayar nota "+chosen.document_number}>
   <form action={legacyPaymentAction} className="form-grid">
    <input type="hidden" name="requestKey" value={randomUUID()}/><input name="number" type="hidden" value={chosen.document_number}/>
    <label>Tanggal terima<input name="date" type="date" defaultValue={today()} required/></label>
    <RupiahField name="amount" label={"Jumlah diterima (maksimal "+rupiah(chosen.confirmed_due??0)+")"} max={Number(chosen.confirmed_due)}/>
    <label>Metode<select name="method" defaultValue="CASH"><option value="CASH">Tunai</option><option value="TRF">Transfer</option><option value="OTHER">Lainnya</option></select></label>
    <label>Referensi / bukti<input name="note" maxLength={250}/></label>
    <SubmitButton className="primary-button">Catat Pembayaran Historis</SubmitButton>
   </form>
  </Panel>}
  {review&&<Panel title={"Koreksi / Nolkan Piutang "+review.document_number} detail="Khusus Owner. Koreksi nonkas dengan jejak audit; bukan menerima uang.">
   <form action={legacyBalanceReviewAction} className="form-grid">
    <input type="hidden" name="requestKey" value={randomUUID()}/><input type="hidden" name="number" value={review.document_number}/>
    <label>Tanggal koreksi<input name="date" type="date" defaultValue={today()} required/></label>
    <RupiahField name="newDue" label="Saldo piutang yang benar (Rp) — ketik 0 untuk nolkan" initial={Number(review.confirmed_due??0)} allowZero/>
    <label className="wide">Alasan dan bukti koreksi (wajib)<input name="reason" required minLength={10} maxLength={400} placeholder="Contoh: penyesuaian piutang berdasarkan berita acara tanggal..."/></label>
    <p className="form-hint wide">Nolkan hanya jika telah diverifikasi lunas melalui sumber lain atau disetujui sebagai penghapusan piutang. Tidak mencatat pemasukan kas/bank.</p>
    <SubmitButton className="primary-button">Simpan Koreksi Piutang</SubmitButton>
   </form>
  </Panel>}
  <Panel title="Daftar UNPAID, sebagian dan perlu verifikasi" detail="Dihitung ulang dari transaksi; bukan pivot statis">
   <div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Outlet</th><th>Tagihan</th><th>Sisa pasti</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>
    {data.unpaid.map(x=><tr key={x.document_number}><td className="mono">{x.document_number}</td><td>{x.issued_on||"—"}</td><td>{x.outlet_name}</td><td>{rupiah(x.final_amount)}</td><td>{x.needs_reconciliation?"Belum bisa dihitung":rupiah(x.confirmed_due??0)}</td><td>{x.needs_reconciliation?"Perlu rekonsiliasi":x.status}</td><td>{!x.needs_reconciliation&&Number(x.confirmed_due)>0?<><Link href={"/invoices/legacy?number="+x.document_number}>Bayar / Koreksi</Link></>:<Link href={"/invoices/legacy?number="+x.document_number}>Verifikasi / Koreksi</Link>}</td></tr>)}
   </tbody></table></div>
   <p className="form-hint">Kuitansi PARTIAL atau tanpa status yang tidak mempunyai rincian pembayaran tidak diasumsikan lunas maupun memiliki angka sisa pasti. Perlu pencocokan buku kas atau bank oleh Owner.</p>
  </Panel>
  <Panel title="Riwayat Koreksi Piutang" detail="Tidak bisa dihapus tanpa jejak; koreksi berikutnya membuat entri baru.">
   <div className="table-wrap"><table><thead><tr><th>Nomor nota</th><th>Saldo ditetapkan</th><th>Tanggal</th><th>Alasan</th><th>Petugas</th></tr></thead><tbody>{reviews.map((r,i)=><tr key={i}><td className="mono">{r.document_number}</td><td>{rupiah(r.new_due)}</td><td>{r.created_at}</td><td>{r.reason}</td><td>{r.created_by}</td></tr>)}</tbody></table></div>
  </Panel>
  <p><Link href="/invoices">Kembali ke Kwitansi Operasional →</Link></p>
 </>;
}
