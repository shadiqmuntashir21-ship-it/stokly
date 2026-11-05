"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, PackagePlus, ShoppingCart, RotateCcw, ChartColumn, LogOut, Menu, X, KeyRound, LayoutGrid, Truck, Sprout, ClipboardCheck, Factory, CalendarDays, ClipboardList, FileText, WalletCards, MapPinned, Calculator, ArrowUpRight, Search, Wifi, ChevronRight } from "lucide-react";
import { useEffect,useState } from "react";
import { authClient } from "@/lib/auth-client";
import { BrandLockup } from "@/components/brand";
import type { Actor,Role } from "@/lib/access";

type NavItem={href:string;label:string;icon:typeof LayoutDashboard;roles:Role[]};
const groups:{title:string;items:NavItem[]}[]=[
 {title:"Beranda",items:[{href:"/dashboard",label:"Pekerjaan Hari Ini",icon:LayoutDashboard,roles:["owner","admin","marketing"]},{href:"/search",label:"Cari Semua Data",icon:Search,roles:["owner","admin","marketing"]}]},
 {title:"Pembelian & QC",items:[
  {href:"/procurement",label:"Pembelian Kelapa",icon:Sprout,roles:["owner","admin"]},
  {href:"/qc",label:"QC & Afkir",icon:ClipboardCheck,roles:["owner","admin"]}]},
 {title:"Produksi & Stok",items:[
  {href:"/production",label:"Produksi",icon:Factory,roles:["owner","admin"]},
  {href:"/products",label:"Produk & Stok",icon:Package,roles:["owner","admin","marketing"]}]},
 {title:"Penjualan & Pengiriman",items:[
  {href:"/orders",label:"Order & Pengiriman",icon:ShoppingCart,roles:["owner","admin","marketing"]},
  {href:"/outlets",label:"Outlet",icon:Truck,roles:["owner","admin","marketing"]},
  {href:"/routes",label:"Rute & Ongkir",icon:MapPinned,roles:["owner","admin"]}]},
 {title:"Pembayaran & Retur",items:[
  {href:"/invoices",label:"Kwitansi & Pembayaran",icon:FileText,roles:["owner","admin"]},
  {href:"/outlet-returns",label:"Retur & Komplain",icon:RotateCcw,roles:["owner","admin","marketing"]}]},
 {title:"Laporan",items:[
  {href:"/reports",label:"Laporan Terpadu",icon:ChartColumn,roles:["owner","admin"]},
  {href:"/expenses",label:"Biaya & Keuangan",icon:WalletCards,roles:["owner"]},
  {href:"/costing",label:"HPP Produksi",icon:Calculator,roles:["owner"]},
  {href:"/closeout",label:"Penutupan Hari",icon:ClipboardCheck,roles:["owner"]}]},
 {title:"Pengaturan & Lainnya",items:[
  {href:"/suppliers",label:"Supplier & Petani",icon:Sprout,roles:["owner","admin"]},
  {href:"/visits",label:"Kunjungan Marketing",icon:CalendarDays,roles:["owner","admin","marketing"]},
  {href:"/settings/security",label:"Ganti PIN Owner",icon:KeyRound,roles:["owner"]},
  {href:"/settings/receipts",label:"Nomor Kwitansi",icon:FileText,roles:["owner"]}]}
];
const legacyItems:NavItem[]=[
 {href:"/receipts",label:"Barang Masuk Manual (Lama)",icon:PackagePlus,roles:["owner","admin"]},
 {href:"/issues",label:"Barang Keluar Nonjual",icon:PackagePlus,roles:["owner","admin"]},
 {href:"/sales",label:"Kasir Lama",icon:ShoppingCart,roles:["owner","admin","marketing"]},
 {href:"/returns",label:"Retur Kasir Lama",icon:RotateCcw,roles:["owner","admin"]}
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
 const [legacyOpen,setLegacyOpen]=useState(false);
 const [online,setOnline]=useState(true);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);return ()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)};},[]);
 const visible=groups.map(g=>({...g,items:g.items.filter(x=>x.roles.includes(actor.role)&&x.label.toLowerCase().includes(search.toLowerCase()))})).filter(g=>g.items.length);
 const oldItems=legacyItems.filter(x=>x.roles.includes(actor.role)&&(legacyOpen||!!search)&&x.label.toLowerCase().includes(search.toLowerCase()));
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
    <div className="nav-group"><button type="button" className="logout-button" onClick={()=>setLegacyOpen(x=>!x)} aria-expanded={legacyOpen}>{legacyOpen?"Tutup menu lama":"Lihat menu arsip/lama"}</button>{oldItems.map(({href,label,icon:Icon})=><Link className="nav-link" key={href} href={href} onClick={()=>setOpen(false)}><Icon size={18}/><span className="nav-text">{label}</span></Link>)}</div>
    {!visible.length&&!oldItems.length&&<p className="nav-empty">Fitur tidak ditemukan.</p>}
   </nav>
   <div className="sidebar-bottom"><div className="user-info"><span className="avatar">{actor.name.charAt(0).toUpperCase()}</span><span><b>{actor.name}</b><small>{actor.role==="owner"?"Owner · Akses penuh":actor.role==="admin"?"Admin operasional":"Tim marketing"}</small></span></div>
    <button className="logout-button" onClick={signOut}><LogOut size={17}/>{actor.role==="owner"?"Kunci Room Owner":"Ganti Room"}<ChevronRight size={14}/></button></div>
  </aside>
  {open&&<button className="side-backdrop" aria-label="Tutup menu" onClick={()=>setOpen(false)} />}
  <div className="main-area">
   <header className="topbar">
    <div className="topbar-start"><button className="menu-button" aria-label="Buka menu" onClick={()=>setOpen(true)}><Menu size={22}/></button>
     <span className="topbar-section">WORKSPACE <ChevronRight size={12}/> <strong>{groups.flatMap(g=>g.items).find(x=>x.href===pathname)?.label||"STOKLY"}</strong></span></div>
    <div className="topbar-right"><Link href="/search" aria-label="Cari transaksi, produk, outlet" title="Cari semua data"><Search size={18}/></Link><span className={"live-pill "+(!online?"status-danger":"")}><Wifi size={14}/> {online?"Online":"Offline"}</span><span className="room-pill">{actor.role==="owner"?"OWNER":actor.role==="admin"?"ADMIN":"MARKETING"}</span><span className="top-avatar">{actor.name.charAt(0).toUpperCase()}</span></div>
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
