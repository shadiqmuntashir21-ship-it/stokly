import Link from "next/link";
import { requireOwner } from "@/lib/access";
import { query } from "@/lib/db";
import { PageHead,Panel,Empty } from "@/components/ui";
import { revokeDevice } from "./actions";
export const dynamic="force-dynamic";
export default async function Devices({searchParams}:{searchParams:Promise<{revoked?:string}>}){
 await requireOwner();
 const [devices,params]=await Promise.all([
   query<{id:string;label:string;created_at:Date;expires_at:Date}>(
     "SELECT id::text,label,created_at,expires_at FROM trusted_devices WHERE revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC"),
   searchParams
 ]);
 return <><PageHead eyebrow="OWNER / KEAMANAN" title="Perangkat Kerja"
    description="Room Admin dan Marketing hanya dapat digunakan pada perangkat yang sudah disetujui."/>
   {params.revoked&&<p className="success-notice">Akses perangkat berhasil dicabut.</p>}
   <Panel title="Perangkat terdaftar">{devices.length===0?<Empty label="perangkat aktif"/>:
     <div className="table-wrap"><table><thead><tr><th>Perangkat</th><th>Diaktifkan</th><th>Berlaku sampai</th><th>Akses</th></tr></thead>
     <tbody>{devices.map(x=><tr key={x.id}>
       <td className="strong-cell">{x.label}</td>
       <td>{new Date(x.created_at).toLocaleDateString("id-ID")}</td>
       <td>{new Date(x.expires_at).toLocaleDateString("id-ID")}</td>
       <td><form action={revokeDevice}><input type="hidden" name="deviceId" value={x.id}/>
         <button type="submit" className="logout-button">Cabut akses</button></form></td>
     </tr>)}</tbody></table></div>}</Panel>
   <Panel title="Perangkat baru"><div style={{padding:24}}>
     <p className="muted">Buka STOKLY di perangkat baru, masuk ke Room Owner menggunakan PIN, lalu pilih Aktivasi Perangkat. Tanpa undangan dan tanpa akun staf.</p>
     <p style={{marginTop:15}}><Link href="/devices/activate" className="primary-button">Aktifkan perangkat saat ini</Link></p>
   </div></Panel>
 </>;
}
