import {SubmitButton} from "@/components/submit-button";
import { requireActor } from "@/lib/access";
import {outlets} from "@/lib/v2-master";
import { PageHead,Panel,Notice,Empty } from "@/components/ui";
import {outletSave,outletArchive} from "../v2-actions";
export const dynamic="force-dynamic";
export default async function Outlets({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const [list,p]=await Promise.all([outlets(),searchParams]);
 return <><PageHead eyebrow="DISTRIBUSI / MASTER DATA" title="Outlet & Pelanggan" description="Kelola nama outlet, nomor kontak dan alamat pengiriman."/><Notice success={p.success} error={p.error}/>
 <Panel title="Tambah Outlet"><form action={outletSave} className="form-grid">
 <label>Nama outlet<input name="name" required maxLength={180}/></label>
 <label>Nomor WhatsApp<input name="phone" type="tel" maxLength={40}/></label>
 <label>Nama PIC<input name="pic" maxLength={120}/></label>
 <label className="wide">Alamat<input name="address" maxLength={1000}/></label><label>Latitude<input name="lat" type="number" min="-90" max="90" step=".0000001" placeholder="-6.2000000"/></label><label>Longitude<input name="lng" type="number" min="-180" max="180" step=".0000001" placeholder="106.8166667"/></label>
 <SubmitButton className="primary-button">Tambah Outlet</SubmitButton></form></Panel>
 <Panel title="Daftar Outlet" detail={list.length+" outlet"}>{!list.length?<Empty label="outlet"/>:<div className="product-manage-list">{list.map(o=><section key={o.id} className="manage-item">
 <div className="manage-item-head"><div><strong>{o.name}</strong><p className="small-muted">{o.phone||"Tanpa nomor"} · {o.pic_name||"Tanpa PIC"} · {o.address||"Alamat belum diisi"}</p>{o.latitude!==null&&o.longitude!==null&&<p className="small-muted">📍 GPS tersimpan · <a target="_blank" rel="noopener noreferrer" href={"https://www.google.com/maps?q="+encodeURIComponent(o.latitude+","+o.longitude)}>Lihat lokasi di Maps</a></p>}</div><span className={o.active?"status-success":"status-danger"}>{o.active?"Aktif":"Arsip"}</span></div>
 {o.active&&<details className="edit-detail"><summary>Edit outlet</summary><form action={outletSave} className="form-grid">
 <input type="hidden" name="id" value={o.id}/>
 <label>Nama<input name="name" defaultValue={o.name} required/></label>
 <label>Telepon<input name="phone" defaultValue={o.phone}/></label>
 <label>PIC<input name="pic" defaultValue={o.pic_name}/></label>
 <label className="wide">Alamat<input name="address" defaultValue={o.address}/></label><label>Latitude<input name="lat" type="number" min="-90" max="90" step=".0000001" defaultValue={o.latitude??""}/></label><label>Longitude<input name="lng" type="number" min="-180" max="180" step=".0000001" defaultValue={o.longitude??""}/></label>
 <SubmitButton className="primary-button">Simpan</SubmitButton></form>
 {actor.role!=="marketing"&&<form action={outletArchive} className="archive-form"><input type="hidden" name="id" value={o.id}/><button className="danger-button">Arsipkan outlet</button></form>}</details>}
 </section>)}</div>}</Panel></>;
}
