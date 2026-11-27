import {SubmitButton} from "@/components/submit-button";
import Link from "next/link";
import {query} from "@/lib/db";
import {GoPurchaseComposer} from "@/components/go-purchase-composer";
import { randomUUID } from "node:crypto";
import { requireActor } from "@/lib/access";
import { suppliers } from "@/lib/v2-master";
import { listGrades, listSupplierPrices, listCoconutReceipts } from "@/lib/coconut-operations";
import { PageHead, Panel, Empty, Notice, rupiah } from "@/components/ui";
import {purchaseCorrectionAction} from "./correction-actions";
import {transactionAudit} from "@/lib/transaction-corrections";
import {SupplierPaymentPanel} from "./payment-panel";
import { addGradeAction,editGradeAction,addSupplierPriceAction,receiveAction } from "../coconut-actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function Procurement({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [supplierList,grades,prices,receipts,params,latestPrices]=await Promise.all([suppliers(),listGrades(),listSupplierPrices(),listCoconutReceipts(true),searchParams,
 query<{supplier_id:string;grade_id:string;unit_price:string}>("SELECT DISTINCT ON (supplier_id,grade_id) supplier_id::text,grade_id::text,unit_price::text FROM supplier_prices WHERE voided_at IS NULL ORDER BY supplier_id,grade_id,effective_at DESC,id DESC")]);
 const audit=await transactionAudit("purchase");
 const activeSuppliers=supplierList.filter(s=>s.active);
 const ready=activeSuppliers.length>0&&grades.length>0;
 return <><PageHead eyebrow="PENGADAAN / BAHAN BAKU" title="Pembelian Kelapa + QC"
 description="Catat grade A/B/C, harga berbeda, hasil lolos/afkir dan sisa belum QC dalam satu proses."/><Notice success={params.success} error={params.error}/>{params.success&&<p className="form-hint"><Link href="/qc">Pembelian berhasil. Jika QC belum selesai, lanjutkan pemeriksaan di QC →</Link></p>}
 <Panel title="Pembelian sekaligus QC" detail="Satu supplier, banyak grade — isi jumlah dan harga tiap grade, lalu simpan sekali">
  {!ready&&<p className="form-hint">Siapkan minimal satu supplier dan grade. Pengaturan grade ada di bawah.</p>}
  <GoPurchaseComposer suppliers={activeSuppliers} grades={grades} prices={latestPrices} requestKey={randomUUID()} date={today()}/>
 </Panel>
 <SupplierPaymentPanel today={today()}/>
 <details className="edit-detail"><summary>Pengaturan lanjutan: grade & harga supplier</summary>
 <Panel title="Kategori ketebalan kelapa" detail="Buat standar ukuran dan kualitas yang mudah digunakan saat pembelian serta QC"><form action={addGradeAction} className="form-grid">
  <label>Kode grade<input name="code" required minLength={2} maxLength={40} placeholder="GRADE-A"/></label>
  <label>Nama grade<input name="name" required maxLength={100} placeholder="Kelapa tebal"/></label>
  <label>Minimum ketebalan (mm, opsional)<input name="min" type="number" min="0" step=".01"/></label>
  <label>Maksimum ketebalan (mm, opsional)<input name="max" type="number" min="0" step=".01"/></label>
  <label className="wide">Standar atau keterangan<input name="notes" maxLength={500}/></label>
  <p className="form-hint wide">Isi sesuai standar QC usaha. Contoh: minimum 1,03 mm dan maksimum 1,50 mm jika itu memang standar yang disepakati. Kosongkan jika belum ditetapkan.</p><SubmitButton className="primary-button">Tambah Grade</SubmitButton>
 </form>
 {grades.length>0&&<div className="table-wrap"><table><thead><tr><th>Kode</th><th>Nama</th><th>Min (mm)</th><th>Maks (mm)</th></tr></thead>
 <tbody>{grades.map(g=><tr key={g.id}><td className="mono">{g.code}</td><td>{g.name}</td><td>{g.thickness_min_mm??"—"}</td><td>{g.thickness_max_mm??"—"}</td></tr>)}</tbody></table></div>}
 {grades.map(g=><details className="edit-detail" key={g.id}>
  <summary>Edit grade: {g.code} — {g.name}</summary>
  <form action={editGradeAction} className="form-grid">
   <input type="hidden" name="id" value={g.id}/>
   <label>Kode grade<input name="code" required defaultValue={g.code}/></label>
   <label>Nama grade<input name="name" required defaultValue={g.name}/></label>
   <label>Minimum ketebalan (mm)<input name="min" type="number" min="0" step=".01" defaultValue={g.thickness_min_mm??""}/></label>
   <label>Maksimum ketebalan (mm)<input name="max" type="number" min="0" step=".01" defaultValue={g.thickness_max_mm??""}/></label>
   <label className="wide">Standar / keterangan<input name="notes" defaultValue={g.notes} maxLength={500}/></label>
   <SubmitButton className="primary-button">Simpan Grade</SubmitButton>
  </form>
 </details>)}
 </Panel>
 <Panel title="Catat harga supplier" detail="Harga per butir, historis">{!ready&&<p className="form-hint">Buat supplier dan grade terlebih dahulu.</p>}
 <form action={addSupplierPriceAction} className="form-grid">
  <label>Supplier<select name="supplierId" required defaultValue=""><option value="" disabled>Pilih supplier</option>{activeSuppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <label>Grade<select name="gradeId" required defaultValue=""><option value="" disabled>Pilih grade</option>{grades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
  <label>Harga per butir (Rp)<input name="price" type="number" min="0" step=".01" required/></label>
  <label className="wide">Catatan<input name="note" maxLength={400} placeholder="Harga kesepakatan terbaru"/></label>
  <SubmitButton className="primary-button" disabled={!ready}>Simpan Harga Supplier</SubmitButton>
 </form>
 {prices.length===0?<Empty label="riwayat harga supplier"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Grade</th><th>Harga / Butir</th></tr></thead><tbody>{prices.map(x=><tr key={x.id}><td>{new Date(x.effective_at).toLocaleDateString("id-ID")}</td><td>{x.supplier_name}</td><td>{x.grade_name}</td><td>{rupiah(x.unit_price)}</td></tr>)}</tbody></table></div>}</Panel>
 </details>
 <Panel title="Riwayat penerimaan bahan baku">{receipts.length===0?<Empty label="penerimaan kelapa"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Grade</th><th>Masuk</th><th>QC Lolos</th><th>Afkir</th><th>Nilai Beli</th><th>Status</th><th>Tindakan</th></tr></thead>
 <tbody>{receipts.map(r=><tr key={r.id}><td>{new Date(r.received_at).toLocaleDateString("id-ID")}</td><td>{r.supplier}</td><td>{r.grade}</td><td>{r.quantity}</td><td>{r.accepted_qty}</td><td>{r.rejected_qty}</td><td>{rupiah(r.total_value)}</td><td>{r.voided_at?"Batal":"Aktif"}</td><td>{!r.voided_at&&r.consumed_qty===0?<details className="edit-detail"><summary>Koreksi / Batalkan</summary><form action={purchaseCorrectionAction} className="form-grid"><input type="hidden" name="id" value={r.id}/><label>Supplier<select name="supplierId" defaultValue={r.supplier_id}>{supplierList.filter(s=>s.active||s.id===r.supplier_id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Grade<select name="gradeId" defaultValue={r.grade_id}>{grades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Tanggal<input name="date" type="date" defaultValue={new Date(r.received_at).toLocaleDateString("sv-SE",{timeZone:"Asia/Makassar"})} required/></label><label>Jumlah<input name="quantity" type="number" min={Math.max(1,r.accepted_qty+r.rejected_qty)} defaultValue={r.quantity} required/></label><label>Harga/butir<input name="price" type="number" min="0.01" step=".01" defaultValue={r.price_per_butir} required/></label><label>Keterangan<input name="note" maxLength={400} defaultValue={r.note}/></label><label className="wide">Alasan wajib<input name="reason" minLength={5} maxLength={400} required/></label><label>Jenis koreksi<select name="mode"><option value="edit">Ubah transaksi</option><option value="void">Batalkan transaksi</option></select></label><label className="wide"><input type="checkbox" name="confirm" value="1" required/> Saya memeriksa dampak stok dan pembayaran yang mungkin dicatat terpisah.</label><SubmitButton className="primary-button">Simpan koreksi</SubmitButton></form></details>:r.voided_at?"—":"Sudah digunakan"}</td></tr>)}</tbody></table></div>}<p className="form-hint">Koreksi langsung hanya untuk bahan baku belum dipakai produksi. Jika harga lama tidak tertaut ke pembelian, riwayat harga supplier lama tetap dipertahankan; pembayaran lama yang tidak tertaut harus dikoreksi terpisah. Pembelian terintegrasi otomatis menghitung ulang utang; nilai tidak boleh lebih kecil dari pembayaran aktif.</p></Panel><Panel title="Riwayat koreksi pembelian"><div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Aksi</th><th>Alasan</th><th>Petugas</th></tr></thead><tbody>{audit.map(a=><tr key={a.id}><td>{new Date(a.created_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td><td>{a.action}</td><td>{a.reason}</td><td>{a.actor_id}</td></tr>)}</tbody></table></div></Panel></>;
}
