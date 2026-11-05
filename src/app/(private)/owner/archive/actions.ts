"use server";
import {requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {verifyArchive} from "@/lib/annual-archive";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function verifyArchiveAction(form:FormData){
 const owner=await requireOwner();
 const id=String(form.get("id")||""),sha=String(form.get("sha")||"");
 await safeWrite("/owner/archive",()=>verifyArchive(id,sha,form.get("confirmed")==="yes",owner.id));
 revalidatePath("/owner/archive");redirect("/owner/archive?success=1");
}
