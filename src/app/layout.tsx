import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
export const metadata: Metadata = {
  title: {default:"STOKLY",template:"%s | STOKLY"},
  description: "Retail management dan inventory yang sederhana dan terintegrasi.",
  applicationName:"STOKLY",
  appleWebApp:{capable:true,title:"STOKLY",statusBarStyle:"default"},
  icons:{icon:"/icons/icon.svg",apple:"/icons/icon.svg"}
};
export const viewport: Viewport = {width:"device-width",initialScale:1,themeColor:"#123e3a"};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {
 return <html lang="id"><body><PwaRegister/>{children}</body></html>;
}
