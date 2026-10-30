"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export default function Login() {
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const { error: loginError } = await authClient.signIn.username({ username:"owner.stokly", password:pin });
      if (loginError) { setError("Username atau PIN tidak sesuai."); return; }
      window.location.assign(window.location.search.includes("activate=1")?"/devices/activate":"/dashboard");
    } catch { setError("Tidak dapat terhubung. Periksa koneksi internet."); }
    finally { setBusy(false); }
  }
  return <main className="login-screen"><section className="login-card">
    <div className="brand-mark">S<span>.</span></div>
    <p className="eyebrow">RETAIL OPERATIONS PLATFORM</p>
    <h1>Masuk Room Owner</h1>
    <p className="muted">Room Owner dilindungi PIN 8 digit. Admin dan Marketing tidak perlu login harian.</p>
    <form onSubmit={submit} className="stack-form">
      <label>PIN (8 digit)<input type="password" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} minLength={8} autoComplete="current-password" required value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="8 angka PIN" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? "Memverifikasi..." : "Buka Room Owner"}</button>
    </form><p className="login-foot"><a href="/rooms">Kembali ke pilihan room</a></p>
  </section></main>;
}
