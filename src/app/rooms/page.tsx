import Link from "next/link";
import { ArrowUpRight, BarChart3, LockKeyhole, PackageCheck, ArrowRight, ShieldCheck, Leaf } from "lucide-react";
import { enterRoom } from "./actions";
import { BrandLockup } from "@/components/brand";

export default async function Rooms({searchParams}:{searchParams:Promise<{denied?:string}>}){
 const params=await searchParams;
 return <main className="rooms-screen">
  <section className="landing-layout">
   <div className="landing-feature">
    <div className="landing-brand"><BrandLockup inverse/></div>
    <div className="landing-art"><img src="/brand/kelapa-brand.webp" width="360" height="399" loading="eager" decoding="async" alt="Maskot dan logo Kelapa Branding Indonesia"/></div>
    <div className="landing-copy"><span className="landing-kicker"><Leaf size={15}/> COCONUT BUSINESS OPERATIONS</span>
     <h1>Satu ruang. <em>Semua operasional</em> kelapa.</h1>
     <p>Kelola stok, order outlet, pembelian, produksi, dan laporan dalam satu aplikasi yang praktis.</p>
     <div className="landing-trust"><span><PackageCheck size={16}/> Stok & produksi</span><span><BarChart3 size={16}/> Monitoring usaha</span></div>
    </div>
   </div>
   <div className="landing-panel">
    <span className="section-index">01 / PILIH AKSES</span>
    <div className="landing-panel-head"><p className="eyebrow">SELAMAT DATANG</p><h2>Mulai bekerja.</h2><p className="muted">Pilih ruang kerja sesuai kebutuhan. Admin dan Marketing bisa langsung masuk tanpa PIN.</p></div>
    {params.denied&&<p className="form-error" role="alert">Fitur tersebut tidak tersedia di Room yang dipilih.</p>}
    <div className="room-choices">
     <form action={enterRoom}><input type="hidden" name="room" value="admin"/><button type="submit" className="room-choice">
      <span className="room-icon"><PackageCheck size={22}/></span><span><strong>Admin Operasional</strong><small>Kelola produk, stok, supplier, QC dan pengiriman</small></span><ArrowRight size={18}/></button></form>
     <form action={enterRoom}><input type="hidden" name="room" value="marketing"/><button type="submit" className="room-choice">
      <span className="room-icon"><BarChart3 size={22}/></span><span><strong>Tim Marketing</strong><small>Outlet, kunjungan, pesanan dan pelanggan</small></span><ArrowRight size={18}/></button></form>
     <Link href="/login" className="room-choice room-owner"><span className="room-icon"><LockKeyhole size={22}/></span><span><strong>Room Owner</strong><small>PIN khusus · laporan keuangan dan pengaturan</small></span><ArrowRight size={18}/></Link>
    </div>
    <div className="landing-help"><ShieldCheck size={16}/><span>Owner tetap dilindungi PIN. Room staf dapat dibuka siapa pun yang punya tautan STOKLY.</span></div>
    <p className="landing-foot">BARU PERTAMA KALI? <Link href="/setup">Aktivasi Owner <ArrowUpRight size={13}/></Link></p>
   </div>
  </section>
 </main>;
}
