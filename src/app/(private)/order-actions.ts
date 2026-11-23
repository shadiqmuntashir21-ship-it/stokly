"use server";
import {safeWrite} from "@/lib/safe-action";
import {requireActor} from "@/lib/access";
import {createOrder,dispatchOrder,payOrder,updatePhysicalReceipt,updateOrderDraft,cancelOrderDraft} from "@/lib/order-operations";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
const n=(f:FormData,k:string)=>Number(f.get(k));
export async function createOrderAction(f:FormData){
 const actor=await requireActor(["owner","admin","marketing"]);
 let parsed:unknown;
 try{parsed=JSON.parse(s(f,"items"));}catch{redirect("/orders?error=Daftar%20item%20tidak%20valid");}
 if(!Array.isArray(parsed))redirect("/orders?error=Daftar%20item%20tidak%20valid");
 const items=parsed.map(x=>({productId:String(x.productId||""),quantity:Number(x.quantity),unitPrice:x.unitPrice===null||x.unitPrice===undefined?null:Number(x.unitPrice)}));
 const orderId=await safeWrite("/orders",()=>createOrder({requestKey:s(f,"requestKey"),outletId:s(f,"outletId"),items,deliveryDate:s(f,"deliveryDate"),note:s(f,"note"),priceReason:s(f,"priceReason")},actor.id,actor.role!=="marketing"));
 const {query}=await import("@/lib/db");
 const row=await query<{document_number:string|null}>("SELECT document_number FROM customer_orders WHERE id=$1",[orderId]);
 revalidatePath("/orders");revalidatePath("/invoices");
 redirect("/orders?success=1&receipt="+encodeURIComponent(row[0]?.document_number||""));
}
export async function dispatchAct¶»§q«^