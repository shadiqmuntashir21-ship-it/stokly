"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, PackagePlus, ShoppingCart, RotateCcw, ChartColumn, LogOut, Menu, X, Users } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { Actor } from "@/lib/access";

const links = [
  {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard,roles:["owner","admin","marketing"]},
  {href:"/products",label:"Produk & Stok",icon:Package,roles:["owner","admin","marketing"]},
  {href:"/receipts",label:"Barang Masuk",icon:PackagePlus,roles:["owner","admin"]},
  {href:"/issues",label:"Barang Keluar",icon:PackagePlus,roles:["owner","admin"]},
  {href:"/sales",label:"Penjualan",icon:ShoppingCart,roles:["owner","admin","marketing"]},
  {href:"/returns",label:"Retur",icon:RotateCcw,roles:["owner","admin"]},
  {href:"/reports",label:"Laporan",icon:ChartColumn,roles:["owner","admin"]},
  {href:"/users",label:"Pengguna",icon:Users,roles:["owner"]}
];
export function Shell({actor,children}:{actor:Actor;children:React.ReactNode}) {
  const pathname=usePathname(); const [open,setOpen]=useState(false);
  const visible=links.filter((link)=>link.roles.includes(actor.role));
  async function signOut(){await authClient.signOut();window.location.assign("/login");}
  return <div className="app-shell">
    <aside className={"sidebar "+(open?"sidebar-open":"")}>
      <div className="sidebar-top"><div className="logo-lockup"><span className="logo-glyph">S.</span><span>STOKLY<small>RETAIL MANAGEMENT</small></span></div><button className="mobile-close" aria-label="Tutup menu" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <p className="side-label">WORKSPACE</p><nav className="side-nav" aria-label="Navigasi utama">{visible.map(({href,label,icon:Icon})=><Link key={href} onClick={()=>setOpen(false)} className={"nav-link "+(pathname===href?"nav-active":"")} href={href}><Icon size={19}/>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="user-info"><span className="avatar">{actor.name.charAt(0).toUpperCase()}</span><span><b>{actor.name}</b><small>{actor.role==="owner"?"Owner":actor.role==="admin"?"Admin Operasional":"Marketing"}</small></span></div><button className="logout-button" onClick={signOut}><LogOut size={17}/> Keluar</button></div>
    </aside>
    {open && <button className="side-backdrop" aria-label="Tutup menu" onClick={()=>setOpen(false)} />}
    <div className="main-area"><header className="topbar"><button className="menu-button" aria-label="Buka menu" onClick={()=>setOpen(true)}><Menu size={23}/></button><span className="mobile-brand">STOKLY</span><div className="topbar-right"><span className="live-pill"><i/> Sistem online</span><span className="top-avatar">{actor.name.charAt(0).toUpperCase()}</span></div></header><main className="content">{children}</main></div>
    <nav className="bottom-nav" aria-label="Navigasi mobile">{visible.slice(0,4).map(({href,label,icon:Icon})=><Link key={href} href={href} className={pathname===href?"active":""}><Icon size={20}/><span>{label}</span></Link>)}</nav>
  </div>;
}
