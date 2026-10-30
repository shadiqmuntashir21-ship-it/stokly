"use server";
import { timingSafeEqual } from "node:crypto";
import { getPool } from "@/lib/db";
import { firstOwnerAuth } from "@/lib/first-owner-auth";
import { normalizeUsername, internalEmail, validPin } from "@/lib/username";
import { redirect } from "next/navigation";

function secureEqual(a: string, b: string) {
  const left=Buffer.from(a,"utf8"), right=Buffer.from(b,"utf8");
  return left.length===right.length && timingSafeEqual(left,right);
}

export async function createFirstOwner(form: FormData) {
  const expected=process.env.STOKLY_SETUP_TOKEN;
  const secret=String(form.get("setupToken")||"");
  const name=String(form.get("name")||"").trim();
  const username=normalizeUsername("owner.stokly");
  const pin=String(form.get("pin")||"");
  if(!expected || expected.length<32 || !secureEqual(secret,expected)){
    throw new Error("Kode aktivasi tidak valid.");
  }
  if(name.length<2 || name.length>90 || !username || !validPin(pin)){
    throw new Error("Nama, username atau PIN tidak valid.");
  }
  const client=await getPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(8491147532)");
    const existing=await client.query("SELECT 1 FROM user_roles WHERE role='owner' LIMIT 1");
    if(existing.rowCount)throw new Error("Akun pemilik sudah diaktifkan.");
    const result=await firstOwnerAuth.api.signUpEmail({
      body:{ name, username, email:internalEmail(username), password:pin }
    });
    if(!result?.user?.id)throw new Error("Akun gagal dibuat.");
    await client.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'owner')",[result.user.id]);
  } finally {
    await client.query("SELECT pg_advisory_unlock(8491147532)").catch(()=>{});
    client.release();
  }
  redirect("/login?activated=1");
}
