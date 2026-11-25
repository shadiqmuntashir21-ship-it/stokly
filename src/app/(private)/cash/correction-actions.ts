"use server";
import {requireActor} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {correctCash} from "@/lib/transaction-corrections";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function cashCorrectionAction(f:FormData){
 const actor=await requireActor(["owner","admin"]),s=(k:string)=>String(f.get(k)||"");
 if(s("confirm")!=="1")redirect("/cash?error=Konfirmasi%20wajib");
 await safeWrite("/cash",()=>correctCash({id:s("id"),mode:s("mode"),reason:s("reason"),date:s("date"),wallet:s("wallet"),category:s("category"),amount:Number(s("amount")),description:s("description"),assetName:s("assetName"),assetQuantity:Number(s("assetQuantity")),assetVendor:s("assetVendor")},actor.id));
 for(const p of ["/cash","/inventory","/dashboard","/owner","/owner/finance","/owner/archive"])revalidatePath(p);
 redirect("/cash?success=1");
}
