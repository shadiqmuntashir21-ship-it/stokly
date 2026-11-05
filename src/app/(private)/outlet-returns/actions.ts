"use server";
import { requireActor } from "@/lib/access";
import { revalidatePath } from "next/cache";
import {redirect} from "next/navigation";
import {safeWrite} from "@/lib/safe-action";
import {createV2Return,reportComplaint,resolveComplaint,settleRefund} from "@/lib/return-operations";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
export async function submitReturn(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 const parts=s(f,"line").split("|");
 await safeWrite("/outlet-returns",()=>createV2Return({requestKey:s(f,"requestKey"),deliveryId:parts[0]||"",orderItemId:parts[1]||"",
  quantity:Number(s(f,"quantity")),qc:s(f,"qc"),restock:s(f,"restock")==="yes",reason:s(f,"reason")},actor.id));
 revalidatePath("/outlet-returns");revalidatePath("/invoices");revalidatePath("/expenses");revalidatePath("/products");
 redirect("/outlet-returns?success=1");
}
export async function submitComplaint(f:FormData){
 const actor=await requireActor(["owner","admin","marketing"]);
 await safeWrite("/outlet-returns",()=>reportComplaint({requestKey:s(f,"requestKey"),outletId:s(f,"outletId"),
 deliveryId:s(f,"deliveryId"),productId:s(f,"productId"),category:s(f,"category"),description:s(f,"description")},actor.id));
 revalidatePath("/outlet-returns");redirect("/outlet-returns?success=1");
}
export async function finishComplaint(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await safeWrite("/outlet-returns",()=>resolveComplaint(s(f,"id"),s(f,"status"),s(f,"resolution"),actor.id));
 revalidatePath("/outlet-returns");redirect("/outlet-returns?success=1");
}

export async function settleRefundAction(f:FormData){
 const actor=await requireActor(["owner"]);
 await safeWrite("/invoices",()=>settleRefund({id:s(f,"id"),method:s(f,"method"),reference:s(f,"reference")},actor.id));
 revalidatePath("/invoices");revalidatePath("/outlet-returns");redirect("/invoices?success=1");
}
