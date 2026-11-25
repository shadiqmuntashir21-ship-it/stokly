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
 if(s(f,"numberMode")==="manual"&&!s(f,"manualNumber").trim())redirect("/orders?error=Nomor%20fisik%20wajib");
 const items=parsed.map(x=>({productId:String(x.productId||""),quantity:Number(x.quantity),unitPrice:x.unitPrice===null||x.unitPrice===undefined?null:Number(x.unitPrice)}));
 const orderId=await safeWrite("/orders",()=>createOrder({requestKey:s(f,"requestKey"),outletId:s(f,"outletId"),items,deliveryDate:s(f,"deliveryDate"),note:s(f,"note"),priceReason:s(f,"priceReason"),manualNumber:s(f,"numberMode")==="manual"?s(f,"manualNumber"):undefined},actor.id,actor.role!=="marketing"));
 const {query}=await import("@/lib/db");
 const row=await query<{document_number:string|null}>("SELECT document_number FROM customer_orders WHERE id=$1",[orderId]);
 revalidatePath("/orders");revalidatePath("/invoices");
 redirect("/orders?success=1&receipt="+encodeURIComponent(row[0]?.document_number||"")+"&order="+encodeURIComponent(orderId));
}
export async function dispatchAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 let items:unknown;
 try{items=JSON.parse(s(f,"items"));}catch{redirect("/orders?error=Item%20pengiriman%20tidak%20valid");}
 if(!Array.isArray(items))redirect("/orders?error=Item%20pengiriman%20tidak%20valid");
 const clean=items.map(x=>({orderItemId:String(x.orderItemId||""),quantity:Number(x.quantity)}));
 const deliveryId=await safeWrite("/orders",()=>dispatchOrder({requestKey:s(f,"requestKey"),orderId:s(f,"orderId"),items:clean,deliveredOn:s(f,"deliveredOn"),note:s(f,"note")},actor.id));
 revalidatePath("/orders");revalidatePath("/invoices");revalidatePath("/products");revalidatePath("/dashboard");redirect("/orders?success=1&delivery="+encodeURIComponent(deliveryId));
}
export async function payAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await safeWrite("/invoices",()=>payOrder({requestKey:s(f,"requestKey"),orderId:s(f,"orderId"),amount:n(f,"amount"),method:s(f,"method"),reference:s(f,"reference")},actor.id));
 revalidatePath("/invoices");redirect("/invoices?success=1");
}
export async function physicalReceiptAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await safeWrite("/invoices",()=>updatePhysicalReceipt({orderId:s(f,"orderId"),type:s(f,"type"),status:s(f,"status")},actor.id));
 revalidatePath("/invoices");redirect("/invoices?success=1");
}

export async function editDraftAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 const id=s(f,"orderId");
 const ids=s(f,"itemIds").split(",").filter(Boolean);
 const items=ids.map(id=>({id,quantity:Number(f.get("qty_"+id)),unitPrice:s(f,"price_"+id)===""?undefined:Number(f.get("price_"+id)),productId:s(f,"product_"+id)||undefined}));
 await safeWrite("/orders/"+id,()=>updateOrderDraft({id,items,outletId:s(f,"outletId")||undefined,manualNumber:s(f,"manualNumber")||undefined,date:s(f,"deliveryDate"),note:s(f,"note"),reason:s(f,"reason")},actor.id));
 for(const p of ["/orders","/orders/"+id,"/invoices","/owner","/owner/archive"])revalidatePath(p);redirect("/orders/"+id+"?success=1");
}
export async function cancelDraftAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 const id=s(f,"orderId");
 if(s(f,"confirm")!=="on"&&s(f,"confirm")!=="1")redirect("/orders/"+id+"?error=Konfirmasi%20pembatalan%20wajib");
 await safeWrite("/orders/"+id,()=>cancelOrderDraft(id,s(f,"reason"),actor.id));
 for(const p of ["/orders","/orders/"+id,"/invoices","/owner","/owner/archive"])revalidatePath(p);redirect(s(f,"returnToList")==="1"?"/orders?success=1":"/orders/"+id+"?success=1");
}
