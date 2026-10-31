import {safeWrite} from "@/lib/safe-action";\n"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/access";
import {saveProduct,setProductPrice,correctStock,archiveProduct,saveSupplier,archiveSupplier,saveOutlet,archiveOutlet} from "@/lib/v2-master";
const v=(f:FormData,k:string)=>String(f.get(k)||"");
const n=(f:FormData,k:string)=>Number(f.get(k));
export async function productSave(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await saveProduct({id:v(f,"id")||undefined,sku:v(f,"sku"),name:v(f,"name"),category:v(f,"category"),unit:v(f,"unit"),description:v(f,"description"),minStock:n(f,"minStock")},a.id);
 revalidatePath("/products");redirect("/products?success=1");
}
export async function productPrice(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await setProductPrice(v(f,"id"),n(f,"price"),v(f,"reason"),a.id);
 revalidatePath("/products");redirect("/products?success=1");
}
export async function productStock(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await correctStock(v(f,"id"),n(f,"expected"),n(f,"actual"),v(f,"reason"),a.id);
 revalidatePath("/products");revalidatePath("/dashboard");redirect("/products?success=1");
}
export async function productArchive(f:FormData){
 const a=await requireActor(["owner","admin"]);await archiveProduct(v(f,"id"),a.id);
 revalidatePath("/products");redirect("/products?success=1");
}
export async function supplierSave(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await saveSupplier({id:v(f,"id")||undefined,name:v(f,"name"),phone:v(f,"phone"),address:v(f,"address"),notes:v(f,"notes")},a.id);
 revalidatePath("/suppliers");redirect("/suppliers?success=1");
}
export async function supplierArchive(f:FormData){
 const a=await requireActor(["owner","admin"]);await archiveSupplier(v(f,"id"),a.id);
 revalidatePath("/suppliers");redirect("/suppliers?success=1");
}
export async function outletSave(f:FormData){
 const a=await requireActor(["owner","admin","marketing"]);
 await saveOutlet({id:v(f,"id")||undefined,name:v(f,"name"),phone:v(f,"phone"),pic:v(f,"pic"),address:v(f,"address")},a.id);
 revalidatePath("/outlets");redirect("/outlets?success=1");
}
export async function outletArchive(f:FormData){
 const a=await requireActor(["owner","admin"]);await archiveOutlet(v(f,"id"),a.id);
 revalidatePath("/outlets");redirect("/outlets?success=1");
}
