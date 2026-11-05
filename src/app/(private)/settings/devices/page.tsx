import {requireOwner} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,Notice} from "@/components/ui";
import {decideDevice} from "./actions";
export const dynamic="force-dynamic";
type Device={id:string;operator_name:string;role:string;status:string;created_at:Date;approved_at:Date|null};
export default async function StaffDevices({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireOwner();
 const [devices,params]=await Promise.all([query<Device>("SELECT id::text,operator_name,role,status,created_at,approved_at FROM staff_devices ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,created_at DESC LIMIT 200"),searchParams]);
 return <><PageHead eyebrow="OWNER / KEAMANAN" title="Perangkat Staf" description="Setujui perangkat sekali, tidak perlu login setiap hari. Cabut akses saat perangkat hilang atau petugas keluar."/><Notice success={params.success} error={params.error}/>
 <Panel title="Permintaan akses & perangkat terdaftar">
  {!devices.length?<p className="form-hint">Belum ada perangkat terdaftar. Staf bisa memilih Room Admin/Marketing dan meminta persetujuan.</p>:
  <div className="product-manage-list">{devices.map(d=><section className="manage-item" key={d.id}>
   <div className="manage-item-head"><div><strong>{d.operator_name}</strong><p className="small-muted">{d.role} · {new Date(d.created_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</p></div>
   <span className={d.status==="approved"?"status-success":d.status==="revoked"?"status-danger":"status-warning"}>{d.status}</span></div>
   {d.status!=="revoked"&&<form action={decideDevice}><input name="id" type="hidden" value={d.id}/><input name="action" type="hidden" value={d.status==="pending"?"approve":"revoke"}/>
    <button type="submit" className="primary-button">{d.status==="pending"?"Setujui perangkat":"Cabut akses"}</button>
   </form>}
  </section>)}</div>}
 </Panel>
 </>;
}
