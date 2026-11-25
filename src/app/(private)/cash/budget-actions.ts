"use server";
import {requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {setDailyBudget} from "@/lib/cash-report";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function saveDailyBudgetAction(f:FormData){
 const actor=await requireOwner(),date=String(f.get("date")||""),amount=String(f.get("amount")||"");
 if(!/^\d+$/.test(amount))redirect("/cash?error=Anggaran%20tidak%20valid");
 await safeWrite("/cash",()=>setDailyBudget(date,Number(amount),String(f.get("reason")||""),actor.id));
 revalidatePath("/cash");revalidatePath("/owner");redirect("/cash?success=1");
}
