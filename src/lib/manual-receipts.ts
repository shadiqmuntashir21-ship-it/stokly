import type {PoolClient} from "pg";
import {BusinessError} from "@/lib/operations";
import {normalizeReceiptNumber} from "./receipt-number-format";
export async function reserveManualNumber(c:PoolClient,value:string){
 const number=normalizeReceiptNumber(value);
 if(!number)throw new BusinessError("Nomor fisik harus 1–7 digit dan bukan nol.");
 // Same row that the automatic allocator updates; held to transaction end.
 await c.query("SELECT singleton FROM receipt_number_settings WHERE singleton=true FOR UPDATE");
 const taken=await c.query("SELECT document_number FROM receipt_register WHERE document_number=$1 UNION ALL SELECT document_number FROM legacy_receipts WHERE document_number=$1 UNION ALL SELECT document_number FROM legacy_void_receipts WHERE document_number=$1 UNION ALL SELECT document_number FROM customer_orders WHERE document_number=$1 UNION ALL SELECT document_number FROM delivery_notes WHERE document_number=$1 LIMIT 1",[number]);
 if(taken.rowCount)throw new BusinessError("Nomor kwitansi sudah dipakai, historis atau dibatalkan. Gunakan nomor fisik lain.");
 return number;
}
export async function replaceReservedNumber(c:PoolClient,orderId:string,oldNumber:string|null,value:string,actor:string,reason:string){
 const normalized=normalizeReceiptNumber(value);
 if(!normalized)throw new BusinessError("Nomor kwitansi tidak valid.");
 if(normalized===oldNumber)return normalized;
 const number=await reserveManualNumber(c,value);
 if(oldNumber){
  const existing=(await c.query<{status:string;order_id:string|null}>("SELECT status,order_id::text FROM receipt_register WHERE document_number=$1 FOR UPDATE",[oldNumber])).rows[0];
  if(existing&&(existing.status!=="RESERVED"||existing.order_id!==orderId))throw new BusinessError("Nomor lama tidak dapat dikoreksi langsung. Rekonsiliasi Owner diperlukan.");
  if(existing)await c.query("UPDATE receipt_register SET status='VOID',order_id=NULL,actor_id=$2,note=$3 WHERE document_number=$1",[oldNumber,actor,"Koreksi ke "+number+" · "+reason.trim().slice(0,300)]);
  else await c.query("INSERT INTO receipt_register(document_number,status,actor_id,note) VALUES($1,'VOID',$2,$3)",[oldNumber,actor,"Koreksi ke "+number+" · "+reason.trim().slice(0,300)]);
 }
 await c.query("INSERT INTO receipt_register(document_number,status,order_id,actor_id,note) VALUES($1,'RESERVED',$2,$3,$4)",[number,orderId,actor,"Koreksi nomor fisik · "+reason.trim().slice(0,300)]);
 await c.query("UPDATE customer_orders SET document_number=$2,receipt_number_pending=false WHERE id=$1",[orderId,number]);
 return number;
}
