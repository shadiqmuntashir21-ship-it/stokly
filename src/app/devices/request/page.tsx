import Link from "next/link";
import {cookies} from "next/headers";
import {getStaffDevice,DEVICE_COOKIE} from "@/lib/trusted-devices";
import {BrandLockup} from "@/components/brand";
import {requestStaffDevice} from "./actions";
export const dynamic="force-dynamic";
export default async function RequestDevice({searchParams}:{searchParams:Promise<{room?:string;submitted?:string;error?:string}>}){
 const p=await searchParams;
 const selected=p.room==="marketing"?"marketing":"admin";
 const jar=await cookies();
 const device=await getStaffDevice(jar.get(DEVICE_COOKIE)?.value);
 const role=device?.role||selected;
 return <main className="login-screen"><section className="login-card">
  <div className="login-brand"><BrandLockup/></div><p className="eyebrow">PERANGKAT STAF</p>
  <h1>Aktivasi perangkat satu kali</h1>
  <p className="muted">Perangkat disetujui Owner sekali, kemudian dapat dipakai harian tanpa PIN.</p>
  {device?.status==="approved"?<>
   <p>Perangkat {device.operator_name} sudah disetujui untuk ruang {device.role}.</p>
   <p><Link href="/rooms">Kembali, lalu pilih ruang {device.role} →</Link></p>
  </>:device?.status==="pending"?<>
   <p className="form-hint">Permintaan akses atas nama {device.operator_name} untuk ruang {device.role} sedang menunggu persetujuan Owner.</p>
   <p><Link href={"/devices/request?room="+role}>Periksa status kembali</Link></p>
   <p>Owner dapat membuka Pengaturan → Perangkat Staf untuk menyetujuinya.</p>
  </>:<>
   {device?.status==="revoked"&&<p className="form-error">Akses perangkat ini telah dicabut. Buat permintaan baru bila disetujui Owner.</p>}
   {p.error&&<p className="form-error">Nama atau peran tidak valid.</p>}
   <form action={requestStaffDevice} className="stack-form">
    <label>Nama petugas<input name="name" placeholder="Nama operator yang menggunakan perangkat" required minLength={2} maxLength={100}/></label>
    <label>Ruang<select name="room" defaultValue={role}><option value="admin">Admin Operasional</option><option value="marketing">Marketing</option></select></label>
    <button type="submit" className="primary-button">Minta Persetujuan Owner</button>
   </form>
  </>}
  <p><Link href="/rooms">← Kembali ke pilihan ruang</Link></p>
 </section></main>;
}
