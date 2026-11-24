import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
import "./kelapago.css";
export const metadata: Metadata = {
  title: {default:"KELAPA GO",template:"%s | KELAPA GO"},
  description: "KELAPA GO — Sistem Operasional & Monitoring Bisnis. Manajemen pembelian, stok, order outlet, dan produksi.",
  applicationName:"KELAPA GO",
  appleWebApp:{capable:true,title:"KELAPA GO",statusBarStyle:"default"},
  icons:{icon:[{url:"/icons/icon.svg?v=5",type:"image/svg+xml"},{url:"/icons/icon-192.png?v=5",sizes:"192x192",type:"image/png"},{url:"/icons/icon-512.png?v=5",sizes:"512x512",type:"image/png"}],shortcut:"/icons/icon-192.png?v=5",apple:"/icons/icon-192.png?v=5"}
};
export const viewport: Viewport = {width:"device-width",initialScale:1,themeColor:"#163f2f"};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {
 return <html lang="id"><body><PwaRegister/>{children}</body></html>;
}
