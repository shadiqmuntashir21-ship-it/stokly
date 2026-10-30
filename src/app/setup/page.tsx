import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { createFirstOwner } from "./actions";

export const dynamic = "force-dynamic";

export default async function Setup({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const params=await searchParams;
  const issue=params.error==="code"
    ? "Kode aktivasi tidak cocok. Salin nilai STOKLY_SETUP_TOKEN dari Vercel, bukan nama variabelnya."
    : params.error==="pin"
      ? "Nama atau PIN tidak valid. Gunakan 8 digit acak, bukan angka berurutan atau berulang."
      : params.error==="config"
        ? "Kode aktivasi belum tersedia di server. Periksa konfigurasi STOKLY_SETUP_TOKEN pada Vercel Production."
        : null;
  const exists = await query("SELECT 1 FROM user_roles WHERE role='owner' LIMIT 1");
  if (exists.length) redirect("/login");
  return <main className="login-screen"><section className="login-card">
    <div className="brand-mark">S<span>.</span></div>
    <p className="eyebrow">AKTIVASI AWAL / STOKLY</p>
    <h1>Siapkan akun Owner</h1>
    <p className="muted">Aktivasi hanya dilakukan sekali. Setelah itu, Owner cukup memasukkan PIN untuk membuka Room Owner.</p>
    {issue && <p className="form-error" role="alert" style={{marginTop:20}}>{issue}</p>}
    <form action={createFirstOwner} className="stack-form">
      <label>Kode aktivasi dari Vercel<input type="password" name="setupToken" minLength={32} required autoComplete="off" placeholder="Nilai STOKLY_SETUP_TOKEN"/></label>
      <label>Nama pemilik<input name="name" minLength={2} maxLength={90} required autoComplete="name"/></label>
      <label>PIN baru (8 angka)<input type="password" name="pin" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} required autoComplete="new-password"/></label>
      <button className="primary-button" type="submit">Aktifkan akun Owner</button>
      <p className="small-muted">Kode aktivasi dan PIN adalah dua hal berbeda. Jangan membagikan keduanya lewat chat.</p>
    </form>
  </section></main>;
}
