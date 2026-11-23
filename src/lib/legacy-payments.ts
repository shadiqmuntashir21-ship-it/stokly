import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
const uuid=(s:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
export async function recordLegacyPayment(input:{key:string;number:string;date:string;amount:number;method:string;note:string},actor:string){
 if(!uuid(input.key)||!/^[0-9]{7}$/.test(input.number)||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||
 !Number.isFinite(input.amount)||input.amount<=0||input.amount>1e12||
 !["CASH","TRF","OTHER"].includes(input.method)||input.note.length>250)
 throw new BusinessError("Pembayaran historis tidak valid.");
 return transaction(async c=>{
  const prior=await c.query("SELECT id FROM legacy_receipt_payments WHERE request_key=$1",[input.key]);
  if(prior.rowCount)return;
  const receipt=await c.query<{document_number:string}>("SELECT document_number FROM legacy_receipts WHERE document_number=$1 FOR UPDATE",[input.number]);
  if(!receipt.rows[0])throw new BusinessError("Nota historis tidak ditemukan.");
  const due=await c.query<{confirmed_due:string|null;needs_reconciliation:boolean}>(
   "SELECT confirmed_due::text,needs_reconciliation FROM v_go_unpaid_current WHERE document_number=$1",[input.number]);
  if(!due.rows[0]||due.rows[0].needs_reconciliation||due.rows[0].confirmed_due===null)
   throw new BusinessError("Saldo piutang belum terverifikasi, minta Owner melakukan koreksi piutang dahulu.");
  const remain=Number(due.rows[0].confirmed_due);
  if(input.amount>remain+¶»§q«^