import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
export const metadata: Metadata = {
  title: {default:"STOKLY",template:"%s | STOKLY"},
  description: "STOKLY — Operasional Kelapa Branding Indonesia. Manajemen pembelian, stok, order outlet, dan produksi.",
  applicationName:"STOKLY • Kelapa Branding Indonesia",
  appleWebApp:{capable:true,title:"STOKLY",statusBarStyle:"default"},
  icons:{icon:[{url:"/icons/icon.svg",type:"image/svg+xml"},{url:"/icons/icon-192.png",sizes:"192x192",type:"image/png"},{url:"/icons/icon-512.png",sizes:"512x512",type:"image/png"}],shortcut:"/icons/icon-192.png",apple:"/icons/icon-192.png"}
};
export const viewport: Viewport = {width:"device-width",initialScale:1,themeColor:"#163f2f"};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {
 return <html lang="id"><body><PwaRegister/>{children}</body></html>;
}
