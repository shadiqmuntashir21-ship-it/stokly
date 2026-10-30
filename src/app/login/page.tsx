"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export default function Login() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const { error: loginError } = await authClient.signIn.email({ email, password });
      if (loginError) { setError("Email atau kata sandi tidak sesuai."); return; }
      window.location.assign("/dashboard");
    } catch { setError("Tidak dapat terhubung. Periksa koneksi internet."); }
    finally { setBusy(false); }
  }
  return <main className="login-screen"><section className="login-card">
    <div className="brand-mark">S<span>.</span></div>
    <p className="eyebrow">RETAIL OPERATIONS PLATFORM</p>
    <h1>Selamat datang di STOKLY</h1>
    <p className="muted">Masuk untuk mengelola persediaan dan penjualan bisnis Anda.</p>
    <form onSubmit={submit} className="stack-form">
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nama@perusahaan.com" /></label>
      <label>Kata sandi<input type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Masukkan kata sandi" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? "Memverifikasi..." : "Masuk ke STOKLY"}</button>
    </form><p className="login-foot">Akses khusus untuk tim yang telah terdaftar.</p>
  </section></main>;
}
