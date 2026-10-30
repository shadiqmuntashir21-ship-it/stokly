"use server";
import { requireActor } from "@/lib/access";
import { firstOwnerAuth } from "@/lib/first-owner-auth";
import { normalizeUsername, internalEmail, validPin } from "@/lib/username";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStaff(form: FormData) {
  await requireActor(["owner"]);
  const name=String(form.get("name")||"").trim();
  const username=normalizeUsername(String(form.get("username")||""));
  const pin=String(form.get("pin")||"");
  const role=String(form.get("role")||"");
  if(role!=="admin" && role!=="marketing")throw new Error("Peran tidak valid.");
  if(name.length<2 || name.length>90 || !username || !validPin(pin))
    throw new Error("Nama, username atau PIN tidak valid.");
  const existing=await query('SELECT 1 FROM "user" WHERE username=$1 LIMIT 1',[username]);
  if(existing.length)throw new Error("Username sudah digunakan.");
  const created=await firstOwnerAuth.api.signUpEmail({
    body:{name,username,email:internalEmail(username),password:pin}
  });
  if(!created?.user?.id)throw new Error("Gagal membuat akun.");
  await query("INSERT INTO user_roles(user_id,role) VALUES ($1,$2)",[created.user.id,role]);
  revalidatePath("/users");
  redirect("/users?success=1");
}
