"use server";
import {randomUUID} from "node:crypto";
import {requireActor,requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {recordCombinedPurchase,recordDailyProduction,registerVoidReceipt,createCashEntry,addInventoryAsset,moveInventoryAsset} from "@/lib/kelapa-go-operations";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
export async function combinedPurchaseAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 let lines:unknown;try{lines=JSON.parse(s(f,"lines"));}catch{redirect("/procurement?error=Grade%20tidak%20valid");}
 if(!Array.isArray(lines))redirect("/procurement?error=Grade%20tidak%20valid");
 await safeWrite("/procurement",()=>recordCombinedPurchase({
  requestKey:s(f,"requestKey"),supplierId:s(f,"supplierId"),date:s(f,"date"),note:s(f,"note"),
  lines:lines.map(x=>({gradeId:String(x.gradeId||""),quantity:Number(x.quantity),unitPrice:Number(x.unitPrice),
   passed:Number(x.passed),rejected:Number(x.rejected)}))
 },actor.id));
 revalidatePath("/procurement");revalidatePath("/qc");revalidatePath("/production");revalidatePath("/dashboard");revalidatePath("/owner");
 redirect("/procurement?success=1");
}
export async function dailyProductionAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 let outputs:unknown;try{outputs=JSON.parse(s(f,"outputs"));}catch{redirect("/production?error=Hasil%20produksi¶»§q«^