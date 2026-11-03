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
 if(!confirmed)throw new BusinessError("Harus menyatakan nomor berikutnya telah dicocokkan dengan spreadsheet lengkap dan buku kwitansi fisik.");
 return transaction(async c=>{
  const settings=await c.query<{next_number:number|null}>("SELECT next_number FROM receipt_number_settings WHERE singleton=true FOR UPDATE");
  if(!settings.rows[0])throw new BusinessError("Pengaturan nomor kwitansi belum tersedia.");
  if(settings.rows[0].next_number===null){
   if(!Number.isSafeInteger(nextNumber)||nextNumber===null||nextNumber<1||nextNumber>9999999)
    throw new BusinessError("Masukkan nomor pertama yang belum pernah digunakan, antara 1 sampai 9999999.");
   const max=await c.query<{max:number|null}>("SELECT MAX(document_number::integer)::int AS max FROM customer_orders WHERE document_number ~ '^[0-9]{7}$'");
   if((max.rows[0]?.max??0)>=nextNumber)throw new BusinessError("Nomor berikutnya harus lebih besar dari semua kwitansi aplikasi yang sudah terbit.");
   await c.query("UPDATE receipt_number_settings SET next_number=$1,updated_at=now() WHERE singleton=true AND next_number IS NULL",[nextNumber]);
  }
  // Only new V3 pending orders may be assigned automatically.
  // Legacy orders remain untouched until their physical numbers are reconciled.
  const pending=await c.query<{id:string}>(
   "SELECT id::text FROM customer_orders WHERE receipt_number_pending=true AND document_number IS NULL ORDER BY created_at,id LIMIT 500 FOR UPDATE"
  );
  for(const row of pending.rows){
   const result=await c.query<{document_number:string|null}>(
    "UPDATE customer_orders SET document_number=allocate_stokly_receipt_number() WHERE id=$1 RETURNING document_number",[row.id]);
   if(!result.rows[0]?.document_number)throw new BusinessError("Rentang nomor habis. Periksa pengaturan penomoran.");
   await c.query("UPDATE customer_orders SET receipt_number_pending=false WHERE id=$1",[row.id]);
  }
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'receipt.numbering.activate','customer_order',gen_random_uuid())",[actor]);
  return pending.rowCount??0;
 });
}
