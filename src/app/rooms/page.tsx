import Link from "next/link";
import { query } from "@/lib/db";
import { enterRoom } from "./actions";

export const dynamic="force-dynamic";

export default async function Rooms({searchParams}:{searchParams:Promise<{denied?:string}>}){
 const [owner,params]=await Promise.all([
   query("SELECT 1 FROM user_roles WHERE role='owner' LIMIT 1"),
   searchParams
 ]);
 return <main className="rooms-screen"><section className="rooms-card">
  <div className="logo-lockup" style={{marginBottom:25}}><span className="logo-glyph">S.</span><span>STOKLY<small>COCONUT OPERATIONS</small></span></div>
  <p className="eyebrow">PILIH RUANG KERJA</p>
  <h1>Masuk ke STOKLY</h1>
  <p className="muted">Admin dan Marketing bisa langsung masuk dari HP atau laptop mana pun tanpa login, PIN, atau aktivasi perangkat. Hanya Owner yang menggunakan PIN.</p>
  {params.denied&&<p className="form-error">Halaman tersebut tidak tersedia untuk Room ini.</p>}
  {!owner.length&&<div className="room-hint">Owner belum diaktifkan. <Link href="/setup"><b>Aktifkan akun Owner</b></Link> untuk menyiapkan bisnis.</div>}
  <div className="room-choices">
    <form action={enterRoom}><input type="hidden" name="room" value="admin"/>
      <button type="submit" className="room-choice">
        <span className="room-icon">◫</span><span><strong>Room Admin</strong><small>Produk, stok, supplier, pembelian, QC, dan pengiriman</small></span><span>›</span>
      </button></form>
    <form action={enterRoom}><input type="hidden" name="room" value="marketing"/>
      <button type="submit" className="room-choice">
        <span className="room-icon">▦</span><span><strong>Room Marketing</strong><small>Outlet, kunjungan, order, dan penjualan</small></span><span>›</span>
      </button></form>
    <Link href="/login" className="room-choice"><span className="room-icon">♛</span>
      <span><strong>Room Owner</strong><small>PIN wajib · akses penuh dan laporan keuangan</small></span><span>›</span></Link>
  </div>
  <p className="small-muted" style={{marginTop:22}}>Perhatian: Room staf terbuka untuk siapa pun yang mengakses STOKLY. Jangan simpan rahasia atau data yang tidak perlu pada Room staf.</p>
 </section></main>;
}
