"use server";
import {safeWrite} from "@/lib/safe-action";
import {requireActor} from "@/lib/access";
import {createOrder,dispatchOrder,payOrder,updatePhysicalReceipt} from "@/lib/order-operations";
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
 await safeWrite("/orders",()=>createOrder({requestKey:s(f,"requestKey"),outletId:s(f,"outletId"),items,deliveryDate:s(f,"deliveryDate"),note:s(f,"note"),priceReason:s(f,"priceReason")},actor.id,actor.role!=="marketing"));
 revalidatePath("/orders");revalidatePath("/invoices");redirect("/orders?success=1");
}
export async function dispatchAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 let items:unknown;
 try{items=JSON.parse(s(f,"items"));}catch{redirect("/orders?error=Item%20pengiriman%20tidak%20valid");}
 if(!Array.isArray(items))redirect("/orders?error=Item%20pengiriman%20tidak%20valid");
 const clean=items.map(x=>({orderItemId:String(x.orderItemId||""),quantity:Number(x.quantity)}));
 await safeWrite("/orders",()=>dispatchOrder({requestKey:s(f,"requestKey"),orderId:s(f,"orderId"),items:clean,deliveredOn:s(f,"deliveredOn"),note:s(f,"note")},actor.id));
 revalidatePath("/orders");revalidatePath("/invoices");revalidatePath("/products");revalidatePath("/dashboard");redirect("/orders?success=1");
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
