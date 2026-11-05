import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";

const isUuid=(v:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export type LegacyReceipt={id:string;outlet:string;ordered_on:string;status:string;deliveries:number;items:number};
export async function unnumberedReceipts(){
 return query<LegacyReceipt>(
  "SELECT o.id::text,t.name AS outlet,o.ordered_on::text,o.status,"+
  "(SELECT COUNT(*)::int FROM delivery_notes d WHERE d.order_id=o.id) AS deliveries,"+
  "(SELECT COUNT(*)::int FROM customer_order_items i WHERE i.order_id=o.id) AS items "+
  "FROM customer_orders o JOIN outlets t ON t.id=o.outlet_id WHERE o.document_number IS NULL "+
  "ORDER BY o.created_at ASC,o.id ASC LIMIT 150");
}
export async function reconcileLegacyReceipt(input:{orderId:string;mode:"physical_existing"|"new_sequence";physicalNumber:string;reason:string;verified:boolean},actor:string){
 if(!isUuid(input.orderId)||!["physical_existing","new_sequence"].includes(input.mode)||
 !input.verified||input.reason.trim().length<8||input.reason.length>400)
  throw new BusinessError("Isi alasan dan konfirmasi bahwa nomor sudah dicek pada buku fisik.");
 if(input.mode==="physical_existing"&&(!/^[0-9]{7}$/.test(input.physicalNumber)||Number(input.physicalNumber)>=9000000||Number(input.physicalNumber)===0))
  throw new BusinessError("Nomor kwitansi fisik lama harus 7 digit dari seri sebelum 9000000.");
 return transaction(async c=>{
  const r=await c.query<{document_number:string|null;status:string}>(
   "SELECT document_number,status FROM customer_orders WHERE id=$1 FOR UPDATE",[input.orderId]);
  if(!r.rows[0])throw new BusinessError("Order tidak ditemukan.");
  if(r.rows[0].document_number)throw new BusinessError("Order ini sudah memiliki nomor. Nomor tidak dapat diganti.");
  if(r.rows[0].status==="cancelled"&&input.mode==="new_sequence")
   throw new BusinessError("Order yang sudah dibatalkan tidak dapat memperoleh nomor baru.");
  const number=input.mode==="new_sequence"?
   (await c.query<{number:string|null}>("SELECT allocate_stokly_receipt_number() AS number")).rows[0]?.number:
   input.physicalNumber;
  if(!number)throw new BusinessError("Penomoran belum aktif. Periksa Pengaturan Kwitansi.");
  const assigned=await c.query<{id:string}>(
   "UPDATE customer_orders SET document_number=$2,receipt_number_pending=false WHERE id=$1 AND document_number IS NULL RETURNING id::text",
   [input.orderId,number]);
  if(!assigned.rowCount)throw new BusinessError("Nomor order berubah. Muat ulang.");
  await c.query(
   "INSERT INTO receipt_number_reconciliations(order_id,document_number,method,note,actor_id) VALUES($1,$2,$3,$4,$5)",
   [input.orderId,number,input.mode,input.reason.trim(),actor]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'receipt.reconcile','customer_order',$2)",[actor,input.orderId]);
  return number;
 });
}
