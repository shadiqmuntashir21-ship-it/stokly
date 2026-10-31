import {SubmitButton} from "@/components/submit-button";
import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listCoconutReceipts} from "@/lib/coconut-operations";
import { PageHead,Panel,Notice,Empty } from "@/components/ui";
import {qcAction} from "../coconut-actions";
export const dynamic="force-dynamic";
export default async function QC({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [batches,params]=await Promise.all([listCoconutReceipts(),searchParams]);
 const open=batches.filter(b=>b.quantity-b.accepted_qty-b.rejected_qty>0);
 return <><PageHead eyebrow="QUALITY CONTROL / BAHAN BAKU" title="QC & Kelapa Afkir" description="Periksa setiap batch: jumlah lolos dan afkir harus sesuai jumlah kelapa yang diperiksa."/><Notice success={params.success} error={params.error}/>
 <Panel title="Catat hasil QC" detail={open.length+" batch belum selesai"}>
 <form action={qcAction} className="form-grid">
 <input type="hidden" name="requestKey" value={randomUUID()}/>
 <label className="wide">Batch<select name="batchId" defaultValue="" required>
 <option value="" disabled>Pilih batch</option>{open.map(b=><option key={b.batch_id} value={b.batch_id}>{b.supplier} — {b.grade} — belum diperiksa {b.quantity-b.accepted_qty-b.rejected_qty} butir</option>)}</select></label>
 <label>Jumlah lolos QC<input name="passed" type="number" min="0" step="1" defaultValue="0" required/></label>
 <label>Jumlah afkir<input name="rejected" type="number" min="0" step="1" defaultValue="0" required/></label>
 <label className="wide">Alasan afkir (wajib jika afkir &gt; 0)<input name="reason" maxLength={400} placeholder="Busuk, pecah, tidak sesuai grade..."/></label>
 <SubmitButton className="primary-button" disabled={!open.length}>Simpan Hasil QC</SubmitButton>
 </form><p className="form-hint">Bisa melakukan QC bertahap. Sisa yang belum diperiksa tetap tercatat terpisah.</p></Panel>
 <Panel title="Rekap batch & QC">{batches.length===0?<Empty label="batch kelapa"/>:<div className="table-wrap"><table><thead><tr><th>Supplier</th><th>Grade</th><th>Diterima</th><th>Lolos</th><th>Afkir</th><th>Belum QC</th><th>Siap produksi</th></tr></thead><tbody>{batches.map(b=><tr key={b.id}><td>{b.supplier}</td><td>{b.grade}</td><td>{b.quantity}</td><td>{b.accepted_qty}</td><td>{b.rejected_qty}</td><td>{b.quantity-b.accepted_qty-b.rejected_qty}</td><td>{b.accepted_qty-b.consumed_qty}</td></tr>)}</tbody></table></div>}</Panel></>;
}
