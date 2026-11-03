import {SubmitButton} from "@/components/submit-button";
import { randomUUID } from "node:crypto";
import { requireActor } from "@/lib/access";
import { suppliers } from "@/lib/v2-master";
import { listGrades, listSupplierPrices, listCoconutReceipts } from "@/lib/coconut-operations";
import { PageHead, Panel, Empty, Notice, rupiah } from "@/components/ui";
import { addGradeAction,editGradeAction,addSupplierPriceAction,receiveAction } from "../coconut-actions";
export const dynamic="force-dynamic";
export default async function Procurement({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [supplierList,grades,prices,receipts,params]=await Promise.all([suppliers(),listGrades(),listSupplierPrices(),listCoconutReceipts(),searchParams]);
 const activeSuppliers=supplierList.filter(s=>s.active);
 const ready=activeSuppliers.length>0&&grades.length>0;
 return <><PageHead eyebrow="PENGADAAN / BAHAN BAKU" title="Pembelian & Kelapa Masuk"
 description="Harga supplier, grade ketebalan, dan batch kelapa mentah yang diterima."/><Notice success={params.success} error={params.error}/>
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
 <Panel title="Terima kelapa mentah" detail="Satu penerimaan = satu batch">
 <form action={receiveAction} className="form-grid">
  <input type="hidden" name="requestKey" value={randomUUID()}/>
  <label>Supplier<select name="supplierId" required defaultValue=""><option value="" disabled>Pilih supplier</option>{activeSuppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <label>Grade<select name="gradeId" required defaultValue=""><option value="" disabled>Pilih grade</option>{grades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
  <label>Kelapa diterima (butir)<input name="quantity" type="number" min="1" step="1" required/></label>
  <label>Harga aktual / butir (Rp)<input name="price" type="number" min="0" step=".01" required/></label>
  <label className="wide">Catatan penerimaan<input name="note" maxLength={400} placeholder="Nomor pembelian / pengiriman"/></label>
  <SubmitButton className="primary-button" disabled={!ready}>Simpan Kelapa Masuk</SubmitButton>
 </form>
 <p className="form-hint">Harga aktual disimpan pada saat penerimaan dan tidak berubah jika harga supplier diperbarui nanti.</p>
 </Panel>
 <Panel title="Riwayat penerimaan bahan baku">{receipts.length===0?<Empty label="penerimaan kelapa"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Grade</th><th>Masuk</th><th>QC Lolos</th><th>Afkir</th><th>Nilai Beli</th></tr></thead>
 <tbody>{receipts.map(r=><tr key={r.id}><td>{new Date(r.received_at).toLocaleDateString("id-ID")}</td><td>{r.supplier}</td><td>{r.grade}</td><td>{r.quantity}</td><td>{r.accepted_qty}</td><td>{r.rejected_qty}</td><td>{rupiah(r.total_value)}</td></tr>)}</tbody></table></div>}</Panel></>;
}
