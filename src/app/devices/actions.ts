"use server";
import { requireOwner } from "@/lib/access";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function revokeDevice(form:FormData){
 await requireOwner();
 const deviceId=String(form.get("deviceId")||"");
 if(!/^[a-f0-9-]{36}$/i.test(deviceId))throw new Error("Perangkat tidak valid.");
 await query("UPDATE trusted_devices SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL",[deviceId]);
 revalidatePath("/devices");
 redirect("/devices?revoked=1");
}
