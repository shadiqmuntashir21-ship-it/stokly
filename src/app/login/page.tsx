
"use client";
import {useState,type FormEvent} from "react";
import {authClient} from "@/lib/auth-client";
import {BrandLockup} from "@/components/brand";
import {LockKeyhole, ArrowRight} from "lucide-react";
import Link from "next/link";
export default function Login(){
 const [pin,setPin]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");setBusy(true);
  try{
   const {error:loginError}=await authClient.signIn.username({username:"owner.stokly",password:pin});
   if(loginError){setError("PIN Owner tidak sesuai.");return;}
   window.location.assign("/dashboard");
  }catch{setError("Koneksi gagal. Periksa internet lalu coba kembali.");}
  finally{setBusy(false);}
 }
 return <main className="login-screen"><section className="login-card">
  <div className="login-brand"><BrandLockup/></div>
  <p className="eyebrow">AKSES EKSKLUSIF OWNER</p><h1>Selamat datang kembali.</h1>
  <p className="muted">Masukkan PIN Owner untuk melihat laporan keuangan dan mengelola seluruh operasional.</p>
  <form onSubmit={submit} className="stack-form">
   <label><span style={{display:"flex",gap:7,alignItems:"center"}}><LockKeyhole size={14}/>PIN Owner · 8 digit</span>
    <input type="password" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} minLength={8} autoComplete="current-password" required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="••••••••"/></label>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <button type="submit" className="primary-button" disabled={busy}>{busy?"Memverifikasi PIN...":<>Masuk Room Owner <ArrowRight size={17}/></>}</button>
  </form><p className="login-foot"><Link href="/rooms">← Kembali ke pilihan Room</Link></p>
 </section></main>;
}
