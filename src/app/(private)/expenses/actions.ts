"use server";\nimport {safeWrite} from "@/lib/safe-action";
import {requireOwner} from "@/lib/access";
import {addExpense} from "@/lib/expense-operations";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
const s=(f:FormData,k:string)=>String(f.get(k)||"");
export async function addExpenseAction(f:FormData){
 const actor=await requireOwner();
 await addExpense({requestKey:s(f,"requestKey"),category:s(f,"category"),amount:Number(s(f,"amount")),date:s(f,"date"),
 note:s(f,"note"),outletId:s(f,"outletId"),productionId:s(f,"productionId")},actor.id);
 revalidatePath("/expenses");redirect("/expenses?success=1");
}
