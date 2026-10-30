"use server";
import { requireActor } from "@/lib/access";
import { firstOwnerAuth } from "@/lib/first-owner-auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStaff(form: FormData) {
  await requireActor(["owner"]);
  const name=String(form.get("name")||"").trim();
  const email=String(form.get("email")||"").trim().toLowerCase();
  const password=String(form.get("password")||"");
  const role=String(form.get("role")||"");
  if(!["admin","marketing"].includes(role)) throw new Error("Role tidak valid.");
  if(name.length<2||name.length>90||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||password.length<12){
    throw new Error("Masukkan nama, email, dan kata sandi minimal 12 karakter.");
  }
  const duplicate=await query("SELECT 1 FROM \"user\" WHERE email=$1 LIMIT 1",[email]);
  if(duplicate.length)throw new Error("Email sudah digunakan.");
  const created=await firstOwnerAuth.api.signUpEmail({body:{name,email,password}});
  if(!created?.user?.id)throw new Error("Gagal membuat akun.");
  await query("INSERT INTO user_roles(user_id,role) VALUES ($1,$2)",[created.user.id,role]);
  revalidatePath("/users");
  redirect("/users?success=1");
}
