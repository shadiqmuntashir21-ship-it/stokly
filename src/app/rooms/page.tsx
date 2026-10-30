import Link from "next/link";
import { query } from "@/lib/db";
import { currentDevice } from "@/lib/trusted-devices";
import { enterRoom } from "./actions";

export const dynamic="force-dynamic";
export default async function Rooms({searchParams}:{searchParams:Promise<{device?:string;activated?:string;denied?:string}>}){
 const [device,owner,params]=await Promise.all([
   currentDevice(),
   query("SELECT 1 FROM user_roles WHERE role='owner' LIMIT 1"),
   searchParams
 ]);
 return <main className="rooms-screen"><section className="rooms-card">
  <div className="logo-lockup" style={{marginBottom:25}}><span className="logo-glyph">S.</span><span>STOKLY<small>RETAIL MANAGEMENT</small></span></div>
  <p className="eyebrow">PILIH RUANG KERJA</p>
  <h1>Masuk ke STOKLY</h1>
  <p className="muted">Admin dan Marketing tidak perlu login harian pada perangkat kerja yang sudah diaktifkan.</p>
  {params.denied&&<p className="form-error">Room tersebut memerlukan akses khusus.</p>}
  {device&&params.activated&&<p className="success-notice">Perangkat ini sudah aktif dan siap digunakan.</p>}
  {!owner.length&&<div className="room-hint">Owner belum diaktifkan. Aktivasi akun utama harus dilakukan terlebih dahulu. <Link href="/setup"><b>Aktifkan Owner</b></Link></div>}
  {owner.length>0&&!device&&<div className="room-hint">Perangkat ini belum diizinkan untuk transaksi. Owner cukup memasukkan PIN <b>satu kali di perangkat ini</b>, tanpa undangan atau QR. <Link href="/login?activate=1"><b>Aktifkan perangkat</b></Link></div>}
  <div className="room-choices">
    <form action={enterRoom}><input type="hidden" name="room" value="admin"/>
      <button className="room-choice" disabled={!device}>
        <span className="room-icon">◫</span><span><strong>Room Admin</strong><small>Produk, persediaan, barang masuk dan retur</small></span><span>›</span>
      </button></form>
    <form action={enterRoom}><input type="hidden" name="room" value="marketing"/>
      <button className="room-choice" disabled={!device}>
        <span className="room-icon">▦</span><span><strong>Room Marketing</strong><small>Katalog dan pencatatan penjualan</small></span><span>›</span>
      </button></form>
    <Link href="/login" className="room-choice"><span className="room-icon">♛</span>
      <span><strong>Room Owner</strong><small>PIN wajib · akses seluruh bisnis</small></span><span>›</span></Link>
  </div>
  {device&&<p className="small-muted" style={{marginTop:22}}>Perangkat terdaftar: {device.label}. Owner dapat mencabut akses kapan saja.</p>}
 </section></main>;
}
