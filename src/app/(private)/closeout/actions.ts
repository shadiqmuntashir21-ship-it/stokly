"use server";
import {requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {closeBusinessDay} from "@/lib/daily-closeout";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function closeDayAction(form:FormData){
 const actor=await requireOwner();
 const date=String(form.get("date")||"");
 const note=String(form.get("note")||"");
 await safeWrite("/closeout",()=>closeBusinessDay(date,note,actor.id));
 revalidatePath("/closeout");redirect("/closeout?success=1");
}
