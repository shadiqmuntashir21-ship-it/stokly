import {SubmitButton} from "@/components/submit-button";
import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listCoconutReceipts} from "@/lib/coconut-operations";
import {PageHead,Panel,Notice,Empty} from "@/components/ui";
import {qcAction} from "../coconut-actions";
export const dynamic="force-dynamic";

export default async function QC({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [receipts,params]=await Promise.all([listCoconutReceipts(),searchParams]);
 const pending=receipts.filter(r=>r.quantity-r.accepted_qty-r.rejected_qty>0);
 const awaiting=pending.reduce((sum,r)=>sum+r.quantity-r.accepted_qty-r.rejected_qty,0);
 return <>
  <PageHead eyebrow="QUALITY CONTROL / BAHAN BAKU" title="QC & Kelapa Afkir"
   description="Periksa kelapa yang belum selesai QC berdasarkan tanggal, supplier dan grade. Tidak perlu memilih batch."/>
  <Notice success={params.success} error={params.error}/>
  <div className="metrics-grid">
   <section className="metric"><div className="metric-label">Penerimaan perlu diperiksa</div><strong>{pending.length}</strong></section>
   <section className="metric"><div className="metric-label">Kelapa menunggu QC</div><strong>{awaiting}</strong></section>
  </div>
  <Panel title="Lanjutkan pemeriksaan" detail={pending.length+" penerimaan belum selesai"}>
   {pending.length===0?
    <p className="form-hint">{receipts.length?"Semua kelapa yang tercatat sudah selesai diperiksa.":"Belum ada kelapa yang perlu diperiksa. Catat Pembelian Kelapa + QC terlebih dahulu."}</p>:
    <div className="product-manage-list">{pending.map((r,i)=>{
     const left=r.quantity-r.accepted_qty-r.rejected_qty;
     return <section key={r.batch_id} className="manage-item">
      <div className="manage-item-head">
       <div><strong>{r.supplier} · {r.grade}</strong>
        <p className="small-muted">{new Date(r.received_at).toLocaleDateString("id-ID",{timeZone:"Asia/Makassar"})} · Penerimaan {i+1}</p>
       </div>
       <div className="manage-values"><span>Belum QC: <b>{left} butir</b></span></div>
      </div>
      <form action={qcAction} className="form-grid">
       <input type="hidden" name="requestKey" value={randomUUID()}/>
       <input type="hidden" name="batchId" value={r.batch_id}/>
       <label>Jumlah lolos QC<input name="passed" type="number" min="0" max={left} step="1" defaultValue="0" required/></label>
       <label>Jumlah afkir<input name="rejected" type="number" min="0" max={left} step="1" defaultValue="0" required/></label>
       <label className="wide">Alasan afkir (wajib jika ada yang rusak)<input name="reason" maxLength={400} placeholder="Busuk, pecah, tidak sesuai kualitas..."/></label>
       <SubmitButton className="primary-button">Simpan QC</SubmitButton>
      </form>
      <p className="form-hint">Boleh diperiksa bertahap. Jumlah lolos + afkir tidak boleh melebihi {left} butir.</p>
     </section>;
    })}</div>}
  </Panel>
  <Panel title="Rekap penerimaan & hasil QC">
   {receipts.length===0?<Empty label="penerimaan kelapa"/>:
    <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Grade</th><th>Diterima</th><th>Lolos</th><th>Afkir</th><th>Belum QC</th><th>Siap produksi</th></tr></thead><tbody>
     {receipts.map(r=><tr key={r.batch_id}>
      <td>{new Date(r.received_at).toLocaleDateString("id-ID",{timeZone:"Asia/Makassar"})}</td>
      <td>{r.supplier}</td><td>{r.grade}</td><td>{r.quantity}</td>
      <td>{r.accepted_qty}</td><td>{r.rejected_qty}</td>
      <td>{r.quantity-r.accepted_qty-r.rejected_qty}</td><td>{r.accepted_qty-r.consumed_qty}</td>
     </tr>)}
    </tbody></table></div>}
   <p className="form-hint">Data penerimaan terhubung otomatis ke pembelian dan stok bahan baku; Anda tidak perlu mengelola nomor batch.</p>
  </Panel>
 </>;
}
