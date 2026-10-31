"use server";
import {safeWrite} from "@/lib/safe-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/access";
import {createGrade,addSupplierPrice,receiveCoconut,recordQc,recordProduction,recordVisit} from "@/lib/coconut-operations";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
const n=(f:FormData,k:string)=>Number(f.get(k));
const optNum=(f:FormData,k:string)=>s(f,k).trim()===""?null:n(f,k);
export async function addGradeAction(f:FormData){
 await requireActor(["owner","admin"]);
 await safeWrite("/procurement",()=>createGrade({code:s(f,"code"),name:s(f,"name"),min:optNum(f,"min"),max:optNum(f,"max"),notes:s(f,"notes")}));
 revalidatePath("/procurement");redirect("/procurement?success=1");
}
export async function addSupplierPriceAction(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await safeWrite("/procurement",()=>addSupplierPrice({supplierId:s(f,"supplierId"),gradeId:s(f,"gradeId"),price:n(f,"price"),note:s(f,"note")},a.id));
 revalidatePath("/procurement");redirect("/procurement?success=1");
}
export async function receiveAction(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await safeWrite("/procurement",()=>receiveCoconut({requestKey:s(f,"requestKey"),supplierId:s(f,"supplierId"),gradeId:s(f,"gradeId"),quantity:n(f,"quantity"),price:n(f,"price"),note:s(f,"note")},a.id));
 revalidatePath("/procurement");redirect("/procurement?success=1");
}
export async function qcAction(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await safeWrite("/qc",()=>recordQc({requestKey:s(f,"requestKey"),batchId:s(f,"batchId"),passed:n(f,"passed"),rejected:n(f,"rejected"),reason:s(f,"reason")},a.id));
 revalidatePath("/qc");revalidatePath("/production");redirect("/qc?success=1");
}
export async function productionAction(f:FormData){
 const a=await requireActor(["owner","admin"]);
 let parsed:unknown;
 try{parsed=JSON.parse(s(f,"outputs"));}catch{redirect("/production?error=Format%20hasil%20produksi%20tidak%20valid.");}
 if(!Array.isArray(parsed))redirect("/production?error=Daftar%20hasil%20produksi%20tidak%20valid.");
 const outputs=parsed.map(x=>({productId:String(x.productId||""),quantity:Number(x.quantity)}));
 await safeWrite("/production",()=>recordProduction({requestKey:s(f,"requestKey"),batchId:s(f,"batchId"),used:n(f,"used"),peeled:n(f,"peeled"),outputs,date:s(f,"date"),note:s(f,"note")},a.id));
 revalidatePath("/production");revalidatePath("/products");revalidatePath("/dashboard");redirect("/production?success=1");
}
export async function visitAction(f:FormData){
 const a=await requireActor(["owner","admin","marketing"]);
 await safeWrite("/visits",()=>recordVisit({requestKey:s(f,"requestKey"),outletId:s(f,"outletId"),date:s(f,"date"),staff:s(f,"staff"),outcome:s(f,"outcome"),note:s(f,"note"),followUp:s(f,"followUp")},a.id));
 revalidatePath("/visits");redirect("/visits?success=1");
}
