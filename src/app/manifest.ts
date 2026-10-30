import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return {
  id:"/",name:"STOKLY — Retail Management",short_name:"STOKLY",
  description:"Kelola stok, barang masuk, barang keluar, penjualan, dan retur.",
  start_url:"/dashboard",scope:"/",display:"standalone",
  background_color:"#f6f8f7",theme_color:"#123e3a",lang:"id",
  icons:[
   {src:"/icons/icon-192.png",sizes:"192x192",type:"image/png",purpose:"maskable"},
   {src:"/icons/icon-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}
  ]
 };
}
