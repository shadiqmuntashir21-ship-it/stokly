"use client";
import {useEffect} from "react";
import Link from "next/link";
export default function AppError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("STOKLY page error",error.digest||"unknown");},[error.digest]);
 return <section className="panel" style={{padding:35}}>
  <h1>Halaman belum berhasil dimuat</h1>
  <p className="muted">Data yang telah tersimpan tidak otomatis hilang. Periksa koneksi dan coba lagi. Jika kesalahan terjadi saat menyimpan, periksa riwayat transaksi sebelum mengulang.</p>
  <div style={{display:"flex",gap:12,marginTop:20,flexWrap:"wrap"}}>
    <button className="primary-button" onClick={reset}>Coba lagi</button><Link className="primary-button" href="/dashboard">Kembali ke Dashboard</Link>
  </div>
  {error.digest&&<p className="small-muted" style={{marginTop:20}}>Kode bantuan: {error.digest}</p>}
 </section>;
}
