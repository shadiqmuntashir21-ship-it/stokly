import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";

export async function receiptSetupStatus(){
 const [settings,pending,legacy]=await Promise.all([
  query<{next_number:number|null}>("SELECT next_number FROM receipt_number_settings WHERE singleton=true LIMIT 1"),
  query<{count:number}>("SELECT COUNT(*)::int AS count FROM customer_orders WHERE receipt_number_pending=true AND document_number IS NULL"),
  query<{count:number}>("SELECT COUNT(*)::int AS count FROM customer_orders WHERE receipt_number_pending=false AND document_number IS NULL")
 ]);
 return {nextNumber:settings[0]?.next_number??null,pending:pending[0]?.count??0,legacy:legacy[0]?.count??0};
}
export async function activateAndAssignReceipts(nextNumber:number|null,confirmed:boolean,actor:string){
 if(!confirmed)throw new BusinessError("Konfirmasi penomoran fisik belum diberikan.");
 if(!Number.isSafeInteger(nextNumber)||nextNumber===null||nextNumber<1||nextNumber>9999999)
  throw new BusinessError("Nomor nota berikutnya tidak valid.");
 return transaction(async c=>{
  const settings=await c.query<{next_number:number|null}>("SELECT next_number FROM receipt_number_settings WHERE singleton=true FOR UPDATE");
  if(!settings.rows[0])throw new BusinessError("Pengaturan nota tidak ditemukan.");
  if(settings.rows[0].next_number!==null)throw new BusinessError("Seri nomor sudah aktif dan tidak dapat diatur ulang.");
  const used=await c.query("SELECT document_number FROM receipt_register WHERE document_number=$1 UNION ALL SELECT document_number FROM customer_orders WHERE document_number=$1 LIMIT 1",[String(nextNumber).padStart(7,"0")]);
  if(used.rowCount)throw new BusinessError("Nomor sudah tercatat, pilih nomor lain.");
  await c.query("UPDATE receipt_number_settings SET next_number=$1,updated_at=now() WHERE singleton=true AND next_number IS NULL",[nextNumber]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'receipt.numbering.activate','customer_order',gen_random_uuid())",[actor]);
  return 0;
 });
}
