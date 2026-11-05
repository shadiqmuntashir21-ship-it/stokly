import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
export type DailySummary={orders:number;shipped:string;received:string;received_cash:string;expenses:string;stock_adjustments:number};
const summarySQL="SELECT "+
 "(SELECT COUNT(*)::int FROM customer_orders WHERE ordered_on=$1::date AND status!='cancelled') AS orders,"+
 "(SELECT COALESCE(SUM(i.gross),0)::text FROM delivery_invoices i JOIN delivery_notes d ON d.id=i.delivery_id WHERE i.status='issued' AND d.delivered_on=$1::date) AS shipped,"+
 "(SELECT COALESCE(SUM(p.amount),0)::text FROM delivery_payments p WHERE (p.paid_at AT TIME ZONE 'Asia/Makassar')::date=$1::date) AS received,"+
 "(SELECT COALESCE(SUM(p.amount),0)::text FROM delivery_payments p WHERE p.payment_method='cash' AND (p.paid_at AT TIME ZONE 'Asia/Makassar')::date=$1::date) AS received_cash,"+
 "(SELECT COALESCE(SUM(amount),0)::text FROM expense_entries WHERE incurred_on=$1::date) AS expenses,"+
 "(SELECT COUNT(*)::int FROM stock_movements WHERE source_type='adjustment' AND (created_at AT TIME ZONE 'Asia/Makassar')::date=$1::date) AS stock_adjustments";
export async function getDailySummary(day:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new BusinessError("Tanggal tidak valid.");
 return (await query<DailySummary>(summarySQL,[day]))[0];
}
export async function dailyCloseouts(){
 return query<{business_date:string;summary:DailySummary;note:string;closed_by:string;closed_at:Date}>(
  "SELECT business_date::text,summary,note,closed_by,closed_at FROM daily_closeouts ORDER BY business_date DESC LIMIT 40");
}
export async function closeBusinessDay(day:string,note:string,actor:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||note.length>400)throw new BusinessError("Tanggal atau catatan tidak valid.");
 return transaction(async c=>{
  await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  const now=await c.query<{today:string}>("SELECT (now() AT TIME ZONE 'Asia/Makassar')::date::text AS today");
  if(day>now.rows[0].today)throw new BusinessError("Tidak dapat menutup tanggal di masa depan.");
  const exists=await c.query("SELECT business_date FROM daily_closeouts WHERE business_date=$1",[day]);
  if(exists.rowCount)throw new BusinessError("Tanggal ini sudah ditutup. Cocokkan perubahan susulan melalui rekonsiliasi.");
  const summary=await c.query<DailySummary>(summarySQL,[day]);
  await c.query("INSERT INTO daily_closeouts(business_date,summary,note,closed_by) VALUES($1,$2::jsonb,$3,$4)",
   [day,JSON.stringify(summary.rows[0]),note.trim(),actor]);
 });
}
