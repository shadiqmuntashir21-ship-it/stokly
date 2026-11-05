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
 let outputs:unknown;try{outputs=JSON.parse(s(f,"outputs"));}catch{redirect("/production?error=Hasil%20produksi%20tidak%20valid");}
 if(!Array.isArray(outputs))redirect("/production?error=Hasil%20produksi%20tidak%20valid");
 await safeWrite("/production",()=>recordDailyProduction({
  requestKey:s(f,"requestKey"),date:s(f,"date"),used:Number(f.get("used")),damaged:Number(f.get("damaged")),
  note:s(f,"note"),outputs:outputs.map(x=>({productId:String(x.productId||""),quantity:Number(x.quantity)}))
 },actor.id));
 revalidatePath("/production");revalidatePath("/products");revalidatePath("/orders");revalidatePath("/dashboard");revalidatePath("/owner");
 redirect("/production?success=1");
}
export async function voidReceiptAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await safeWrite("/invoices",()=>registerVoidReceipt({number:s(f,"number"),reason:s(f,"reason")},actor.id));
 revalidatePath("/invoices");revalidatePath("/orders");redirect("/invoices?success=1");
}
export async function newCashEntryAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 const direction=s(f,"direction");
 if(direction!=="IN"&&direction!=="OUT")redirect("/cash?error=Arah%20kas%20tidak%20valid");
 await safeWrite("/cash",()=>createCashEntry({key:s(f,"requestKey")||randomUUID(),date:s(f,"date"),
  direction,category:s(f,"category"),amount:Number(f.get("amount")),description:s(f,"description")},actor.id));
 revalidatePath("/cash");revalidatePath("/dashboard");revalidatePath("/owner");redirect("/cash?success=1");
}
export async function newAssetAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await safeWrite("/inventory",()=>addInventoryAsset({name:s(f,"name"),quantity:Number(f.get("quantity")),note:s(f,"note")},actor.id));
 revalidatePath("/inventory");redirect("/inventory?success=1");
}
export async function assetMovementAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await safeWrite("/inventory",()=>moveInventoryAsset({id:s(f,"assetId"),date:s(f,"date"),kind:s(f,"kind"),
  quantity:Number(f.get("quantity")),outletId:s(f,"outletId"),note:s(f,"note")},actor.id));
 revalidatePath("/inventory");redirect("/inventory?success=1");
}
