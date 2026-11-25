"use server";
import {requireActor} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {correctPurchase} from "@/lib/transaction-corrections";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function purchaseCorrectionAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 const s=(k:string)=>String(f.get(k)||"");
 if(s("confirm")!=="1")redirect("/procurement?error=Konfirmasi%20wajib");
 await safeWrite("/procurement",()=>correctPurchase({id:s("id"),mode:s("mode"),reason:s("reason"),supplierId:s("supplierId"),gradeId:s("gradeId"),date:s("date"),quantity:Number(s("quantity")),price:Number(s("price")),note:s("note")},actor.id));
 for(const path of ["/procurement","/qc","/production","/dashboard","/owner","/owner/operations","/owner/archive"])revalidatePath(path);
 redirect("/procurement?success=1");
}
