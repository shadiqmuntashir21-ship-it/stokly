import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { createFirstOwner } from "./actions";

export const dynamic = "force-dynamic";

export default async function Setup() {
  const exists = await query("SELECT 1 FROM user_roles WHERE role='owner' LIMIT 1");
  if (exists.length) redirect("/login");
  return <main className="login-screen"><section className="login-card">
    <div className="brand-mark">S<span>.</span></div>
    <p className="eyebrow">AKTIVASI AWAL / STOKLY</p>
    <h1>Siapkan akun Owner</h1>
    <p className="muted">Halaman ini hanya bisa digunakan sekali untuk mengaktifkan pemilik aplikasi. Simpan kata sandi secara pribadi.</p>
    <form action={createFirstOwner} className="stack-form">
      <label>Kode aktivasi<input type="password" name="setupToken" minLength={32} required autoComplete="off"/></label>
      <label>Nama pemilik<input name="name" minLength={2} maxLength={90} required autoComplete="name"/></label>
      <label>Username<input type="text" name="username" required autoComplete="username"/></label>
      <label>PIN baru (8 angka)<input type="password" name="pin" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} required autoComplete="new-password"/></label>
      <button className="primary-button" type="submit">Aktifkan akun Owner</button>
    </form>
  </section></main>;
}
