"use server";
import {requireOwner} from "@/lib/access";
import {query} from "@/lib/db";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function decideDevice(form:FormData){
 const owner=await requireOwner();
 const id=String(form.get("id")||"");
 const action=String(form.get("action")||"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["approve","revoke"].includes(action))redirect("/settings/devices?error=Permintaan%20tidak%20valid");
 if(action==="approve")await query("UPDATE staff_devices SET status='approved',approved_at=now(),approved_by=$2,revoked_at=NULL WHERE id=$1 AND status='pending'",[id,owner.id]);
 else await query("UPDATE staff_devices SET status='revoked',revoked_at=now() WHERE id=$1 AND status='approved'",[id]);
 revalidatePath("/settings/devices");
 redirect("/settings/devices?success=1");
}
