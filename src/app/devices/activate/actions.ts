"use server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/access";
import { query } from "@/lib/db";
import { DEVICE_COOKIE, DEVICE_MAX_AGE,hashDeviceToken } from "@/lib/trusted-devices";

export async function activateCurrentDevice(form:FormData){
 const owner=await requireOwner();
 const label=String(form.get("label")||"Perangkat kerja").trim().slice(0,120);
 if(label.length<3)throw new Error("Nama perangkat harus minimal tiga karakter.");
 const token=randomBytes(32).toString("base64url");
 await query(
   "INSERT INTO trusted_devices(token_hash,label,activated_by,expires_at) VALUES ($1,$2,$3,now()+interval '180 days')",
   [hashDeviceToken(token),label,owner.id]
 );
 const jar=await cookies();
 jar.set(DEVICE_COOKIE,token,{
   httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:DEVICE_MAX_AGE
 });
 redirect("/rooms?activated=1");
}
