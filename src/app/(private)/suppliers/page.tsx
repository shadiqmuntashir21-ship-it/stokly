import { requireActor } from "@/lib/access";
import { suppliers } from "@/lib/v2-master";
import { PageHead,Panel,Notice,Empty } from "@/components/ui";
import {supplierSave,supplierArchive} from "../v2-actions";
export const dynamic="force-dynamic";
export default async function Suppliers({searchParams}:{searchParams:Promise<{success?:string}>}){
 await requireActor(["owner","admin"]); const [list,p]=await Promise.all([suppliers(),searchParams]);
 return <><PageHead eyebrow="PENGADAAN / MASTER DATA" title="Supplier & Petani" description="Kontak petani, alamat, serta data dasar pemasok kelapa."/><Notice success={p.success}/>
 <Panel title="Tambah Supplier"><form action={supplierSave} className="form-grid">
 <label>Nama petani/supplier<input name="name" required maxLength={160}/></label>
 <label>Nomor WhatsApp<input name="phone" type="tel" maxLength={40}/></label>
 <label className="wide">Alamat<input name="address" maxLength={1000}/></label>
 <label className="wide">Catatan<input name="notes" maxLength={1000}/></label>
 <button className="primary-button">Tambah Supplier</button></form></Panel>
 <Panel title="Daftar Supplier" detail={list.length+" data"}>{list.length===0?<Empty label="supplier"/>:<div className="product-manage-list">
 {list.map(s=><section key={s.id} className="manage-item">
  <div className="manage-item-head"><div><strong>{s.name}</strong><p className="small-muted">{s.phone||"Belum ada nomor"} · {s.address||"Alamat belum diisi"}</p></div><span className={s.active?"status-success":"status-danger"}>{s.active?"Aktif":"Arsip"}</span></div>
  {s.active&&<details className="edit-detail"><summary>Edit data supplier</summary><form action={supplierSave} className="form-grid">
  <input type="hidden" name="id" value={s.id}/>
  <label>Nama<input name="name" defaultValue={s.name} required/></label>
  <label>Telepon<input name="phone" defaultValue={s.phone}/></label>
  <label className="wide">Alamat<input name="address" defaultValue={s.address}/></label>
  <label className="wide">Catatan<input name="notes" defaultValue={s.notes}/></label>
  <button className="primary-button">Simpan</button></form>
  <form action={supplierArchive} className="archive-form"><input type="hidden" name="id" value={s.id}/><button className="danger-button">Arsipkan supplier</button></form>
  </details>}
 </section>)}</div>}</Panel></>;
}
