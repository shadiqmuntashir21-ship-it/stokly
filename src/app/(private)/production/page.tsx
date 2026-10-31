import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listProducts} from "@/lib/operations";
import {listCoconutReceipts,listProduction} from "@/lib/coconut-operations";
import {PageHead,Panel,Notice,Empty} from "@/components/ui";
import {productionAction} from "../coconut-actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function Production({searchParams}:{searchParams:Promise<{success?:string}>}){
 await requireActor(["owner","admin"]);
 const [batches,products,runs,params]=await Promise.all([listCoconutReceipts(),listProducts(),listProduction(),searchParams]);
 const available=batches.filter(b=>b.accepted_qty-b.consumed_qty>0);
 return <><PageHead eyebrow="PRODUKSI / HARIAN" title="Pengupasan & Hasil Produksi" description="Bahan baku lolos QC dipakai untuk produksi, lalu hasil produk jadi masuk stok otomatis."/><Notice success={params.success}/>
 <Panel title="Catat produksi"><form action={productionAction} className="form-grid">
  <input type="hidden" name="requestKey" value={randomUUID()}/>
  <label>Tanggal produksi<input name="date" type="date" defaultValue={today()} required/></label>
  <label className="wide">Batch bahan baku<select name="batchId" required defaultValue=""><option value="" disabled>Pilih batch</option>{available.map(b=><option key={b.batch_id} value={b.batch_id}>{b.supplier} — {b.grade} — siap {b.accepted_qty-b.consumed_qty} butir</option>)}</select></label>
  <label>Kelapa digunakan (butir)<input type="number" min="1" step="1" name="used" required/></label>
  <label>Jumlah dikupas (butir)<input type="number" min="0" step="1" name="peeled" required/></label>
  <label>Produk hasil<select name="productId" required defaultValue=""><option value="" disabled>Pilih produk jadi</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select></label>
  <label>Jumlah produk jadi<input type="number" name="output" min="1" step="1" required/></label>
  <label className="wide">Catatan<input name="note" maxLength={400} placeholder="Susut, batch kerja, kendala produksi..."/></label>
  <button className="primary-button" disabled={!available.length||!products.length}>Simpan Produksi</button>
 </form><p className="form-hint">Satu catatan = satu jenis produk hasil. Jika satu proses menghasilkan beberapa produk, catat per hasil tanpa memakai ulang bahan baku yang sama. Alokasi multi-output dalam satu batch masih dalam pengembangan.</p></Panel>
 <Panel title="Riwayat produksi">{runs.length===0?<Empty label="produksi"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Supplier bahan</th><th>Bahan terpakai</th><th>Dikupas</th><th>Produk jadi</th><th>Hasil</th></tr></thead><tbody>{runs.map(r=><tr key={r.id}><td>{r.production_date}</td><td>{r.supplier}</td><td>{r.coconut_used}</td><td>{r.peeled_qty}</td><td>{r.product}</td><td>{r.produced_qty}</td></tr>)}</tbody></table></div>}</Panel></>;
}
