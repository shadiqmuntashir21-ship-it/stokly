"use server";
import {requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {activateAndAssignReceipts} from "@/lib/receipt-setup";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export async function activateReceiptAction(form:FormData){
 const actor=await requireOwner();
 const raw=String(form.get("nextNumber")||"").trim();
 const number=raw===""?null:Number(raw);
 await safeWrite("/settings/receipts",()=>activateAndAssignReceipts(number,form.get("confirmed")==="yes",actor.id));
 revalidatePath("/settings/receipts");
 revalidatePath("/orders");
 revalidatePath("/invoices");
 redirect("/settings/receipts?success=1");
}
