import {randomUUID} from "node:crypto";
import Link from "next/link";
import {requireActor} from "@/lib/access";
import {legacyReceiptsSummary} from "@/lib/legacy-payments";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {legacyPaymentAction} from "./actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function LegacyReceipts({searchParams}:{searchParams:Promise<{success?:string;error?:string;number?:string}>}){
 await requireActor(["owner","admin"]);
 const [data,p]=await Promise.all([legacyReceiptsSummary(),searchParams]);
 const chosen=data.unpaid.find(x=>x.document_number===p.number&&!x.needs_reconciliation&&Number(x.confirmed_due)>0);
 return <>
  <PageHead eyebrow="KWITANSI / DATA AWAL" title="Piutang & Nota Historis KELAPA GO" description="Rekap otomatis dari status pembayaran nota lama. Bukan transaksi baru. Tidak menggandakan order atau pengiriman di STOKLY."/>
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
    <label>Jumlah diterima (maksimal {rupiah(chosen.confirmed_due)})<input name="amount" type="number" min="1" step="0.01" max={Number(chosen.confirmed_due)} required/></label>
    <label>Metode<select name="method" defaultValue="CASH"><option value="CASH">Tunai</option><option value="TRF">Transfer</option><option value="OTHER">Lainnya</option></select></label>
    <label>Referensi / bukti<input name="note" maxLength={250}/></label>
    <SubmitButton className="primary-button">Catat Pembayaran Historis</SubmitButton>
   </form>
  </Panel>}
  <Panel title="Daftar UNPAID, sebagian dan perlu verifikasi" detail="Dihitung ulang dari transaksi; bukan pivot statis">
   <div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Outlet</th><th>Tagihan</th><th>Sisa pasti</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>
    {data.unpaid.map(x=><tr key={x.document_number}><td className="mono">{x.document_number}</td><td>{x.issued_on||"—"}</td><td>{x.outlet_name}</td><td>{rupiah(x.final_amount)}</td><td>{x.needs_reconciliation?"Belum bisa dihitung":rupiah(x.confirmed_due)}</td><td>{x.needs_reconciliation?"Perlu rekonsiliasi":x.status}</td><td>{!x.needs_reconciliation&&Number(x.confirmed_due)>0?<Link href={"/invoices/legacy?number="+x.document_number}>Catat bayar</Link>:"—"}</td></tr>)}
   </tbody></table></div>
   <p className="form-hint">Kuitansi PARTIAL atau tanpa status yang tidak mempunyai rincian pembayaran tidak diasumsikan lunas maupun memiliki angka sisa pasti. Perlu pencocokan buku kas atau bank oleh Owner.</p>
  </Panel>
  <p><Link href="/invoices">Kembali ke Kwitansi Operasional →</Link></p>
 </>;
}
