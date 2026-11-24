import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
const uuid=(s:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
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
  if(input.amount>remain+0.001)throw new BusinessError("Pembayaran melebihi sisa tagihan historis.");
  await c.query("INSERT INTO legacy_receipt_payments(request_key,document_number,paid_on,amount,payment_method,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
   [input.key,input.number,input.date,input.amount,input.method,input.note.slice(0,250),actor]);
  const next=remain-input.amount<=0.001?"PAID":"PARTIAL";
  await c.query("UPDATE legacy_receipts SET status=$2 WHERE document_number=$1",[input.number,next]);
  if(input.method==="CASH"||input.method==="TRF")
   await c.query("INSERT INTO cash_ledger_entries(request_key,entry_date,direction,category,description,amount,reference_type,reference_id,created_by) VALUES($1,$2,'IN',$3,$4,$5,'legacy_receipt',$6,$7) ON CONFLICT(request_key) DO NOTHING",
    [input.key,input.date,input.method==="CASH"?"PENJUALAN CASH":"PENJUALAN TRANSFER","Pembayaran historis nota "+input.number,input.amount,input.number,actor]);
 });
}
export async function legacyReceiptsSummary(){
 const [stat,unpaid]=await Promise.all([
 query<{receipts:number;gross:string;returned:string;paid:number;unpaid_count:number;unpaid_amount:string;review:number}>(
  "SELECT (SELECT COUNT(*)::int FROM legacy_receipts) receipts,(SELECT COALESCE(SUM(gross),0)::text FROM legacy_receipts) gross,(SELECT COALESCE(SUM(return_value),0)::text FROM legacy_receipts) returned,(SELECT COUNT(*)::int FROM legacy_receipts WHERE status='PAID') paid,(SELECT COUNT(*)::int FROM v_go_unpaid_current WHERE confirmed_due>0) unpaid_count,(SELECT COALESCE(SUM(confirmed_due),0)::text FROM v_go_unpaid_current) unpaid_amount,(SELECT COUNT(*)::int FROM v_go_unpaid_current WHERE needs_reconciliation) review"),
 query<{document_number:string;issued_on:string|null;outlet_name:string;final_amount:string;status:string;confirmed_due:string|null;needs_reconciliation:boolean;new_payments:string}>(
  "SELECT document_number,issued_on::text,outlet_name,final_amount::text,status,confirmed_due::text,needs_reconciliation,new_payments::text FROM v_go_unpaid_current ORDER BY needs_reconciliation DESC,issued_on DESC NULLS LAST,document_number DESC LIMIT 500")
 ]);
 return {stat:stat[0],unpaid};
}
export async function legacyOutletSummary(){
 return query<{outlet_name:string;receipt_count:number;total_pcs:number;net_sales:string;confirmed_unpaid:string;needs_reconciliation:number}>(
  "SELECT outlet_name,receipt_count,total_pcs,net_sales::text,confirmed_unpaid::text,needs_reconciliation FROM v_go_outlet_summary_current ORDER BY net_sales DESC LIMIT 200");
}

export async function recordLegacyBalanceReview(input:{key:string;number:string;date:string;newDue:number;reason:string},actor:string){
 if(!uuid(input.key)||!/^[0-9]{7}$/.test(input.number)||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||
  !Number.isFinite(input.newDue)||input.newDue<0||input.newDue>1e12||
  input.reason.trim().length<10||input.reason.length>400)
  throw new BusinessError("Koreksi piutang tidak valid. Isi saldo rupiah dan alasan minimal 10 karakter.");
 return transaction(async c=>{
  const prior=await c.query("SELECT id FROM legacy_receipt_balance_reviews WHERE request_key=$1",[input.key]);
  if(prior.rowCount)return;
  const receipt=await c.query<{status:string;original_status:string}>(
   "SELECT status,upper(COALESCE(original->>7,'')) AS original_status FROM legacy_receipts WHERE document_number=$1 FOR UPDATE",[input.number]);
  if(!receipt.rows[0])throw new BusinessError("Nota historis tidak ditemukan.");
  if(receipt.rows[0].original_status==="PAID")
   throw new BusinessError("Nota tercatat sudah lunas di Excel; tidak boleh membuka piutang baru tanpa rekonsiliasi sumber.");
  const paid=await c.query<{total:string}>("SELECT COALESCE(SUM(amount),0)::text AS total FROM legacy_receipt_payments WHERE document_number=$1",[input.number]);
  await c.query(
   "INSERT INTO legacy_receipt_balance_reviews(request_key,document_number,review_date,new_due,payments_at_review,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
   [input.key,input.number,input.date,input.newDue,Number(paid.rows[0].total),input.reason.trim(),actor]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'legacy_receipt.due.review','legacy_receipt',NULL)",[actor]);
 });
}
