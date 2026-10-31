"use server";
import {requireOwner} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {assignCostShares} from "@/lib/costing-operations";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
export async function allocateCosts(f:FormData){
 const actor=await requireOwner();
 const ids=f.getAll("productId").map(String);
 const pct=f.getAll("pct").map(Number);
 await safeWrite("/costing",()=>assignCostShares(s(f,"productionId"),ids.map((productId,i)=>({productId,percent:pct[i]})),actor.id));
 revalidatePath("/costing");redirect("/costing?success=1");
}
