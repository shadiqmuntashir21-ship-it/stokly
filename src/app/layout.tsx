import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
export const metadata: Metadata = {
  title: {default:"STOKLY",template:"%s | STOKLY"},
  description: "STOKLY — Operasional Kelapa Branding Indonesia. Manajemen pembelian, stok, order outlet, dan produksi.",
  applicationName:"STOKLY • Kelapa Branding Indonesia",
  appleWebApp:{capable:true,title:"STOKLY",statusBarStyle:"default"},
  icons:{icon:"/icons/icon.svg",shortcut:"/icons/icon.svg",apple:"/icons/icon-192.png"}
};
export const viewport: Viewport = {width:"device-width",initialScale:1,themeColor:"#163f2f"};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {
 return <html lang="id"><body><PwaRegister/>{children}</body></html>;
}
