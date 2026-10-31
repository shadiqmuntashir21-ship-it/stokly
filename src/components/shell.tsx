"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, PackagePlus, ShoppingCart, RotateCcw, ChartColumn, LogOut, Menu, X, KeyRound, LayoutGrid, Truck, Sprout, ClipboardCheck, Factory, CalendarDays, ClipboardList, FileText, WalletCards, MapPinned, Calculator, ArrowUpRight, Search, Wifi, ChevronRight } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { BrandLockup } from "@/components/brand";
import type { Actor,Role } from "@/lib/access";

type NavItem={href:string;label:string;icon:typeof LayoutDashboard;roles:Role[]};
const groups:{title:string;items:NavItem[]}[]=[
 {title:"Ringkasan",items:[
  {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard,roles:["owner","admin","marketing"]},
  {href:"/products",label:"Produk & Stok",icon:Package,roles:["owner","admin","marketing"]},
 ]},
 {title:"Operasional Kelapa",items:[
  {href:"/suppliers",label:"Supplier & Petani",icon:Sprout,roles:["owner","admin"]},
  {href:"/procurement",label:"Pembelian Kelapa",icon:ClipboardList,roles:["owner","admin"]},
  {href:"/qc",label:"QC & Afkir",icon:ClipboardCheck,roles:["owner","admin"]},
  {href:"/production",label:"Pengupasan & Produksi",icon:Factory,roles:["owner","admin"]},
  {href:"/receipts",label:"Barang Masuk (Manual)",icon:PackagePlus,roles:["owner","admin"]},
  {href:"/issues",label:"Penyesuaian Keluar",icon:PackagePlus,roles:["owner","admin"]},
 ]},
 {title:"Penjualan & Pelanggan",items:[
  {href:"/outlets",label:"Outlet",icon:Truck,roles:["owner","admin","marketing"]},
  {href:"/visits",label:"Kunjungan Marketing",icon:CalendarDays,roles:["owner","admin","marketing"]},
  {href:"/orders",label:"Order Outlet",icon:ShoppingCart,roles:["owner","admin","marketing"]},
  {href:"/invoices",label:"Nota & Pembayaran",icon:FileText,roles:["owner","admin"]},
  {href:"/outlet-returns",label:"Retur & Komplain",icon:RotateCcw,roles:["owner","admin","marketing"]},
  {href:"/sales",label:"Kasir Lama",icon:ShoppingCart,roles:["owner","admin","marketing"]},
  {href:"/returns",label:"Retur Kasir Lama",icon:RotateCcw,roles:["owner","admin"]},
 ]},
 {title:"Analitik & Manajemen",items:[
  {href:"/routes",label:"Rute & Ongkir",icon:MapPinned,roles:["owner","admin"]},
  {href:"/expenses",label:"Buku Biaya",icon:WalletCards,roles:["owner"]},
  {href:"/costing",label:"HPP Produksi",icon:Calculator,roles:["owner"]},
  {href:"/reports",label:"Laporan",icon:ChartColumn,roles:["owner","admin"]},
  {href:"/settings/security",label:"Ganti PIN Owner",icon:KeyRound,roles:["owner"]},
 ]}
];
const mobileHrefs=["/dashboard","/products","/orders","/outlets"];
function NavFeedback(){
 const {pending}=useLinkStatus();
 return <span className={"nav-feedback "+(pending?"nav-feedback-pending":"")} aria-hidden="true"/>;
}
export function Shell({actor,children}:{actor:Actor;children:React.ReactNode}){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const [search,setSearch]=useState("");
 const visible=groups.map(g=>({...g,items:g.items.filter(x=>x.roles.includes(actor.role)&&x.label.toLowerCase().includes(search.toLowerCase()))})).filter(g=>g.items.length);
 const mobile=groups.flatMap(g=>g.items).filter(x=>mobileHrefs.includes(x.href)&&x.roles.includes(actor.role));
 async function signOut(){
  if(actor.role==="owner")await authClient.signOut();
  window.location.assign("/rooms");
 }
 return <div className="app-shell">
  <aside className={"sidebar "+(open?"sidebar-open":"")} aria-label="Menu utama">
   <div className="sidebar-top"><Link href="/dashboard" onClick={()=>setOpen(false)}><BrandLockup compact inverse/></Link><button className="mobile-close" aria-label="Tutup menu" onClick={()=>setOpen(false)}><X size={20}/></button></div>
   <div className="sidebar-search"><Search size={17}/><input type="search" aria-label="Cari fitur" placeholder="Cari fitur..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
   <nav className="side-nav" aria-label="Navigasi utama">
    {visible.map(group=><div className="nav-group" key={group.title}>
     <p className="side-label">{group.title}</p>
     {group.items.map(({href,label,icon:Icon})=><Link key={href} href={href} prefetch={true} onClick={()=>setOpen(false)} aria-current={pathname===href?"page":undefined} className={"nav-link "+(pathname===href?"nav-active":"")}>
      <Icon size={18} strokeWidth={1.8}/><span className="nav-text">{label}</span><NavFeedback/>
     </Link>)}
    </div>)}
    {!visible.length&&<p className="nav-empty">Fitur tidak ditemukan.</p>}
   </nav>
   <div className="sidebar-bottom"><div className="user-info"><span className="avatar">{actor.name.charAt(0).toUpperCase()}</span><span><b>{actor.name}</b><small>{actor.role==="owner"?"Owner · Akses penuh":actor.role==="admin"?"Admin operasional":"Tim marketing"}</small></span></div>
    <button className="logout-button" onClick={signOut}><LogOut size={17}/>{actor.role==="owner"?"Kunci Room Owner":"Ganti Room"}<ChevronRight size={14}/></button></div>
  </aside>
  {open&&<button className="side-backdrop" aria-label="Tutup menu" onClick={()=>setOpen(false)} />}
  <div className="main-area">
   <header className="topbar">
    <div className="topbar-start"><button className="menu-button" aria-label="Buka menu" onClick={()=>setOpen(true)}><Menu size={22}/></button>
     <span className="topbar-section">WORKSPACE <ChevronRight size={12}/> <strong>{groups.flatMap(g=>g.items).find(x=>x.href===pathname)?.label||"STOKLY"}</strong></span></div>
    <div className="topbar-right"><span className="live-pill"><Wifi size={14}/> Online</span><span className="room-pill">{actor.role==="owner"?"OWNER":actor.role==="admin"?"ADMIN":"MARKETING"}</span><span className="top-avatar">{actor.name.charAt(0).toUpperCase()}</span></div>
   </header>
   <main className="content" id="main-content">{children}</main>
   <footer className="app-footer">STOKLY <span>·</span> Kelapa Branding Indonesia <span>·</span> Operasional usaha dalam satu ruang.</footer>
  </div>
  <nav className="bottom-nav" aria-label="Navigasi cepat mobile">
   {mobile.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={pathname===href?"page":undefined} className={pathname===href?"active":""}>
    <Icon size={19}/><span>{href==="/products"?"Produk":href==="/orders"?"Order":href==="/dashboard"?"Beranda":"Outlet"}</span><NavFeedback/>
   </Link>)}
   <button type="button" className="bottom-more" onClick={()=>setOpen(true)}><Menu size={20}/><span>Menu</span></button>
  </nav>
 </div>;
}
