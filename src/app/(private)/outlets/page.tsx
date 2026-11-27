import {SubmitButton} from "@/components/submit-button";
import { requireActor } from "@/lib/access";
import {outlets,outletGroups} from "@/lib/v2-master";
import { PageHead,Panel,Notice,Empty } from "@/components/ui";
import {outletSave,outletArchive,outletGroupSave,outletDelete} from "../v2-actions";
export const dynamic="force-dynamic";
export default async function Outlets({searchParams}:{searchParams:Promise<{success?:string;error?:string;q?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const p=await searchParams;
 const q=(p.q||"").trim().slice(0,180);
 const [list,groups]=await Promise.all([outlets(q),outletGroups()]);
 return <><PageHead eyebrow="DISTRIBUSI / MASTER DATA" title="Outlet & Pelanggan" description="Kelola nama outlet, nomor kontak dan alamat pengiriman."/><Notice success={p.success} error={p.error}/>
 {actor.role!=="marketing"&&<Panel title="Kelompok Outlet (G.O)" detail="Digunakan dalam rekap kwitansi sesuai spreadsheet">
 <form action={outletGroupSave} className="form-grid">
  <label className="wide">Nama grup outlet<input name="name" required minLength={2} maxLength={160} placeholder="Contoh: RM SIDRAP"/></label>
  <SubmitButton className="primary-button">Tambah / Aktifkan Grup</SubmitButton>
 </form>
 <p className="form-hint">Grup tersedia: {groups.length?groups.map(g=>g.name).join(", "):"Belum ada. Tambahkan kelompok terlebih dahulu."}</p>
 </Panel>}
 <Panel title="Tambah Outlet"><form action={outletSave} className="form-grid">
 <label>Nama outlet<input name="name" required maxLength={180}/></label>
 <label>G.O / Grup Outlet<select name="groupId" defaultValue=""><option value="">Tanpa grup</option>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
 <label>Nomor WhatsApp<input name="phone" type="tel" maxLength={40}/></label>
 <label>Nama PIC<input name="pic" maxLength={120}/></label>
 <label className="wide">Alamat<input name="address" maxLength={1000}/></label>
 <SubmitButton className="primary-button">Tambah Outlet</SubmitButton></form></Panel>
 <Panel title="Daftar Outlet" detail={list.length+" outlet"}><form method="get" action="/outlets" className="form-grid"><label className="wide">Cari outlet<input name="q" type="search" defaultValue={q} maxLength={180} placeholder="Nama outlet, G.O, nomor, PIC atau alamat"/></label><button className="primary-button" type="submit">Cari Outlet</button>{q&&<a href="/outlets">Reset pencarian</a>}</form>{!list.length?(q?<p className="form-hint">Tidak ada outlet yang cocok dengan pencarian.</p>:<Empty label="outlet"/>):<div className="product-manage-list">{list.map(o=><section key={o.id} className="manage-item">
 <div className="manage-item-head"><div><strong>{o.name}</strong><p className="small-muted">{o.group_name||"Tanpa G.O"} · {o.phone||"Tanpa nomor"} · {o.pic_name||"Tanpa PIC"} · {o.address||"Alamat belum diisi"}</p></div><span className={o.active?"status-success":"status-danger"}>{o.active?"Aktif":"Arsip"}</span></div>
 {o.active&&<details className="edit-detail"><summary>Edit outlet</summary><form action={outletSave} className="form-grid">
 <input type="hidden" name="id" value={o.id}/>
 <label>Nama<input name="name" defaultValue={o.name} required/></label>
 <label>G.O / Grup<select name="groupId" defaultValue={o.group_id||""}><option value="">Tanpa grup</option>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
 <label>Telepon<input name="phone" defaultValue={o.phone}/></label>
 <label>PIC<input name="pic" defaultValue={o.pic_name}/></label>
 <label className="wide">Alamat<input name="address" defaultValue={o.address}/></label><input type="hidden" name="preserveLocation" value="1"/>
 <SubmitButton className="primary-button">Simpan</SubmitButton></form>
 {actor.role!=="marketing"&&<form action={outletArchive} className="archive-form"><input type="hidden" name="id" value={o.id}/><button className="danger-button">Arsipkan outlet</button></form>}</details>}
 {actor.role!=="marketing"&&<details className="edit-detail"><summary>Hapus outlet</summary><form action={outletDelete} className="form-grid"><input type="hidden" name="id" value={o.id}/><p className="form-hint wide">Hanya outlet tanpa riwayat transaksi atau data terkait yang dapat dihapus permanen. Jika sudah digunakan, arsipkan.</p><label className="wide"><span><input type="checkbox" name="confirm" value="1" required/> Saya yakin ingin menghapus {o.name}.</span></label><SubmitButton className="danger-button">Hapus Permanen</SubmitButton></form></details>}
 </section>)}</div>}</Panel></>;
}
