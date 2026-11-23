"use server";
import {requireActor,requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {recordLegacyPayment,recordLegacyBalanceReview} from "@/lib/legacy-payments";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
export async function legacyPaymentAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await safeWrite("/invoices/legacy",()=>recordLegacyPayment({
  key:String(f.get("requestKey")||""),number:String(f.get("number")||""),
  date:String(f.get("date")||""),amount:Number(f.get("amount")),
  method:String(f.get("method")||"CASH"),note:String(f.get("note")||"")
 },actor.id));
 revalidatePath("/invoices/legacy");revalidatePath("/cash");revalidatePath("/owner");revalidatePath("/owner/legacy");
 redirect("/invoices/legacy?success=1");
}

export async function legacyBalanceReviewAction(f:FormData){
 const actor=await requireOwner();
 await safeWrite("/invoices/legacy",()=>recordLegacyBalanceReview({
  key:String(f.get("requestKey")||""),number:String(f.get("number")||""),
  date:String(f.get("date")||""),newDue:Number(f.get("newDue")),
  reason:String(f.get("reason")||"")
 },actor.id));
 revalidatePath("/invoices/legacy");revalidatePath("/owner");revalidatePath("/owner/legacy");
 redirect("/invoices/legacy?success=1");
}
