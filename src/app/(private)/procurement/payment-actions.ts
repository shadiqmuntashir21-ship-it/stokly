"use server";
import {requireActor} from "@/lib/access";
import {safeWrite} from "@/lib/safe-action";
import {recordSupplierPayment,voidSupplierPayment} from "@/lib/supplier-payments";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
function refresh(){for(const p of ["/procurement","/cash","/owner","/owner/finance","/dashboard","/owner/archive"])revalidatePath(p);}
export async function supplierPaymentAction(f:FormData){
 const a=await requireActor(["owner","admin"]),s=(k:string)=>String(f.get(k)||"");
 await safeWrite("/procurement",()=>recordSupplierPayment({groupId:s("groupId"),key:s("requestKey"),date:s("date"),small:Number(s("small")),large:Number(s("large")),note:s("note")},a.id));
 refresh();redirect("/procurement?success=1#supplier-payments");
}
export async function voidSupplierPaymentAction(f:FormData){
 const a=await requireActor(["owner","admin"]),s=(k:string)=>String(f.get(k)||"");
 if(s("confirm")!=="1")redirect("/procurement?error=Konfirmasi%20wajib#supplier-payments");
 await safeWrite("/procurement",()=>voidSupplierPayment(s("id"),s("reason"),a.id));
 refresh();redirect("/procurement?success=1#supplier-payments");
}
