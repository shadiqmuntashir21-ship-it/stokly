import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return {
  id:"/",name:"KELAPA GO — Sistem Operasional",short_name:"KELAPA GO",
  description:"Manajemen produksi, persediaan, supplier, outlet, dan order usaha kelapa.",
  start_url:"/rooms",scope:"/",display:"standalone",
  background_color:"#f6f8f7",theme_color:"#123e3a",lang:"id",
  icons:[
   {src:"/icons/icon.svg?v=5",sizes:"any",type:"image/svg+xml",purpose:"any"},
   {src:"/icons/icon-192.png?v=5",sizes:"192x192",type:"image/png",purpose:"maskable"},
   {src:"/icons/icon-512.png?v=5",sizes:"512x512",type:"image/png",purpose:"maskable"}
  ]
 };
}
