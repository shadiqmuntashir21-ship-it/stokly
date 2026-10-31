"use server";\nimport {safeWrite} from "@/lib/safe-action";
import { requireActor } from "@/lib/access";
import { createOrder,dispatch,payInvoice } from "@/lib/order-operations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
const n=(f:FormData,k:string)=>Number(f.get(k));
export async function createOrderAction(f:FormData){
 const actor=await requireActor(["owner","admin","marketing"]);
 let items:unknown;
 try{items=JSON.parse(s(f,"items"));}catch{throw new Error("Daftar item order tidak valid.");}
 if(!Array.isArray(items))throw new Error("Daftar item tidak valid.");
 const clean=items.map(x=>({productId:String(x.productId||""),quantity:Number(x.quantity)}));
 await createOrder({requestKey:s(f,"requestKey"),outletId:s(f,"outletId"),items:clean,deliveryDate:s(f,"deliveryDate"),note:s(f,"note")},actor.id);
 revalidatePath("/orders");redirect("/orders?success=1");
}
export async function dispatchAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await dispatch({requestKey:s(f,"requestKey"),orderItemId:s(f,"orderItemId"),quantity:n(f,"quantity"),deliveredOn:s(f,"deliveredOn"),note:s(f,"note")},actor.id);
 revalidatePath("/orders");revalidatePath("/invoices");revalidatePath("/products");redirect("/orders?success=1");
}
export async function payAction(f:FormData){
 const actor=await requireActor(["owner","admin"]);
 await payInvoice({requestKey:s(f,"requestKey"),invoiceId:s(f,"invoiceId"),amount:n(f,"amount"),method:s(f,"method"),reference:s(f,"reference")},actor.id);
 revalidatePath("/invoices");redirect("/invoices?success=1");
}
