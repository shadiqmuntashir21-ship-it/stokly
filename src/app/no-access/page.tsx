import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export default async function NoAccess() {
  const session = await auth.api.getSession({headers:await headers()});
  if (!session) redirect("/login");
  return <main className="login-screen"><section className="login-card"><div className="brand-mark">S<span>.</span></div><h1>Akses belum diaktifkan</h1><p className="muted">Akun Anda berhasil masuk, tetapi peran belum diberikan. Hubungi pemilik bisnis untuk mengaktifkan akun.</p></section></main>;
}
