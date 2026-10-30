import Link from "next/link";
import { requireOwner } from "@/lib/access";
import { activateCurrentDevice } from "./actions";
export const dynamic="force-dynamic";
export default async function ActivateDevice(){
 await requireOwner();
 return <main className="login-screen"><section className="login-card">
   <div className="brand-mark">S<span>.</span></div>
   <p className="eyebrow">OWNER / AKTIVASI PERANGKAT</p>
   <h1>Izinkan perangkat kerja</h1>
   <p className="muted">Cukup lakukan sekali pada HP atau komputer Admin/Marketing. Sesudah disetujui, mereka tidak perlu login maupun PIN harian.</p>
   <form className="stack-form" action={activateCurrentDevice}>
      <label>Nama perangkat<input type="text" name="label" minLength={3} maxLength={120} required placeholder="Contoh: HP Admin Toko"/></label>
      <button type="submit" className="primary-button">Aktifkan perangkat ini</button>
   </form>
   <p className="login-foot"><Link href="/dashboard">Kembali ke Room Owner</Link></p>
 </section></main>;
}
