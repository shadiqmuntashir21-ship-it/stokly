"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/access";
import { createProduct,receipt,sell,returnSale } from "@/lib/operations";
const val=(form:FormData,key:string)=>String(form.get(key)||"");
const num=(form:FormData,key:string)=>Number(form.get(key));
export async function addProduct(form:FormData){
 const actor=await requireActor(["owner","admin"]);
 await createProduct({sku:val(form,"sku"),name:val(form,"name"),category:val(form,"category"),price:num(form,"price"),minStock:num(form,"minStock")},actor.id);
 revalidatePath("/products"); redirect("/products?success=1");
}
export async function addReceipt(form:FormData){
 const actor=await requireActor(["owner","admin"]);
 await receipt({productId:val(form,"product"),quantity:num(form,"quantity"),note:val(form,"note")},actor.id);
 revalidatePath("/dashboard");revalidatePath("/products");redirect("/receipts?success=1");
}
export async function addSale(form:FormData){
 const actor=await requireActor(["owner","admin","marketing"]);
 await sell({items:[{productId:val(form,"product"),quantity:num(form,"quantity")}],key:val(form,"key")},actor.id);
 revalidatePath("/dashboard");revalidatePath("/products");redirect("/sales?success=1");
}
export async function addReturn(form:FormData){
 const actor=await requireActor(["owner","admin"]);
 await returnSale({saleId:val(form,"sale"),productId:val(form,"product"),quantity:num(form,"quantity"),restock:val(form,"restock")==="yes",note:val(form,"note")},actor.id);
 revalidatePath("/dashboard");revalidatePath("/products");redirect("/returns?success=1");
}
