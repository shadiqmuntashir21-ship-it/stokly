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
      <label>Email pemilik<input type="email" name="email" required autoComplete="email"/></label>
      <label>Kata sandi baru<input type="password" name="password" minLength={12} maxLength={128} required autoComplete="new-password"/></label>
      <button className="primary-button" type="submit">Aktifkan akun Owner</button>
    </form>
  </section></main>;
}
