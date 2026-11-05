"use server";
import {requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {reconcileLegacyReceipt} from "@/lib/receipt-reconciliation";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export async function reconcileReceiptAction(form:FormData){
 const owner=await requireOwner();
 const orderId=String(form.get("orderId")||"");
 const mode=String(form.get("mode")||"");
 if(mode!=="physical_existing"&&mode!=="new_sequence")
  redirect("/owner/receipts?error=Metode%20tidak%20valid");
 await safeWrite("/owner/receipts",()=>reconcileLegacyReceipt({
  orderId,mode,physicalNumber:String(form.get("physicalNumber")||""),
  reason:String(form.get("reason")||""),verified:form.get("verified")==="yes"
 },owner.id));
 revalidatePath("/owner/receipts");revalidatePath("/orders");
 revalidatePath("/invoices");revalidatePath("/orders/"+orderId);
 redirect("/owner/receipts?success=1");
}
