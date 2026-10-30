"use server";
import { timingSafeEqual } from "node:crypto";
import { getPool } from "@/lib/db";
import { firstOwnerAuth } from "@/lib/first-owner-auth";
import { redirect } from "next/navigation";

function secureEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createFirstOwner(form: FormData) {
  const expected = process.env.STOKLY_SETUP_TOKEN;
  const key = String(form.get("setupToken") || "");
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!expected || expected.length < 32 || !secureEqual(key, expected)) {
    throw new Error("Kode aktivasi tidak valid.");
  }
  if (name.length < 2 || name.length > 90 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      password.length < 12 || password.length > 128) {
    throw new Error("Nama, email, atau kata sandi tidak memenuhi persyaratan.");
  }
  const client = await getPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(8491147532)");
    const existing = await client.query("SELECT 1 FROM user_roles WHERE role='owner' LIMIT 1");
    if (existing.rowCount) throw new Error("Akun pemilik sudah diaktifkan.");
    const signup = await firstOwnerAuth.api.signUpEmail({ body: { name, email, password } });
    if (!signup?.user?.id) throw new Error("Gagal membuat akun pemilik.");
    await client.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'owner')", [signup.user.id]);
  } finally {
    await client.query("SELECT pg_advisory_unlock(8491147532)").catch(()=>{});
    client.release();
  }
  redirect("/login?activated=1");
}
