"use server";
import {requireActor} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {createRoute,attachDelivery,recordRouteCost} from "@/lib/route-operations";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
export async function routeCreate(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await safeWrite("/routes",()=>createRoute({requestKey:s(f,"requestKey"),title:s(f,"title"),date:s(f,"date"),
 vehicle:s(f,"vehicle"),driver:s(f,"driver"),distance:s(f,"distance")===""?null:Number(s(f,"distance")),note:s(f,"note")},a.id));
 revalidatePath("/routes");redirect("/routes?success=1");
}
export async function routeStop(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await safeWrite("/routes",()=>attachDelivery(s(f,"routeId"),s(f,"deliveryId"),Number(s(f,"stopOrder")),a.id));
 revalidatePath("/routes");redirect("/routes?success=1");
}
export async function routeCost(f:FormData){
 const a=await requireActor(["owner","admin"]);
 await safeWrite("/routes",()=>recordRouteCost({requestKey:s(f,"requestKey"),routeId:s(f,"routeId"),
 category:s(f,"category"),amount:Number(s(f,"amount")),note:s(f,"note")},a.id));
 revalidatePath("/routes");redirect("/routes?success=1");
}
