import {transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
export const todayWita=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const day=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
export function reportPeriod(from:string,to:string){
 if(!day(from)||!day(to)||from>to||(Date.parse(to)-Date.parse(from))/86400000>365)throw new BusinessError("Pilih rentang tanggal maksimal 366 hari.");
 return {from,to};
}
export type CashRow={date:string;wallet:string;direction:string;category:string;description:string;amount:string};
type CashTotal={wallet:string;opening:string|null;incoming:string;outgoing:string;operational:string;assets:string;closing:string|null};
type Budget={date:string;budget:string|null;spent:string};
const classify="CASE WHEN category LIKE 'KAS BESAR:%' OR category='PENJUALAN TRANSFER' THEN 'LARGE' ELSE 'SMALL' END";
const operational="regexp_replace(category,'^KAS BESAR: ','') IN ('OPERASIONAL','BBM/TRANSPORT')";
export async function cashReport(from:string,to:string){
 reportPeriod(from,to);
 return transaction(async c=>{
  await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const totals=(await c.query<CashTotal>(`WITH w(wallet) AS (VALUES('SMALL'),('LARGE')), e AS (SELECT *, ${classify} wallet FROM cash_ledger_entries)
  SELECT w.wallet,
  CASE WHEN o.amount IS NULL THEN NULL ELSE (o.amount+COALESCE(SUM(CASE WHEN e.direction='IN' THEN e.amount ELSE -e.amount END) FILTER(WHERE e.entry_date<$1::date),0))::text END opening,
  COALESCE(SUM(e.amount) FILTER(WHERE e.entry_date BETWEEN $1 AND $2 AND e.direction='IN'),0)::text incoming,
  COALESCE(SUM(e.amount) FILTER(WHERE e.entry_date BETWEEN $1 AND $2 AND e.direction='OUT'),0)::text outgoing,
  COALESCE(SUM(e.amount) FILTER(WHERE e.entry_date BETWEEN $1 AND $2 AND e.direction='OUT' AND ${operational}),0)::text operational,
  COALESCE(SUM(e.amount) FILTER(WHERE e.entry_date BETWEEN $1 AND $2 AND e.direction='OUT' AND regexp_replace(category,'^KAS BESAR: ','')='ASET'),0)::text assets,
  CASE WHEN o.amount IS NULL THEN NULL ELSE (o.amount+COALESCE(SUM(CASE WHEN e.direction='IN' THEN e.amount ELSE -e.amount END) FILTER(WHERE e.entry_date<=$2::date),0))::text END closing
  FROM w LEFT JOIN operational_cash_openings o ON o.wallet=w.wallet LEFT JOIN e ON e.wallet=w.wallet GROUP BY w.wallet,o.amount ORDER BY w.wallet DESC`,[from,to])).rows;
  const rows=(await c.query<CashRow>(`SELECT entry_date::text date,${classify} wallet,direction,regexp_replace(category,'^KAS BESAR: ','') category,description,amount::text FROM cash_ledger_entries WHERE entry_date BETWEEN $1 AND $2 ORDER BY entry_date,created_at,id LIMIT 10001`,[from,to])).rows;
  if(rows.length>10000)throw new BusinessError("Terlalu banyak transaksi. Pilih periode lebih pendek.");
  const budgets=(await c.query<Budget>(`SELECT d::date::text date,b.amount::text budget,
  COALESCE((SELECT SUM(e.amount) FROM cash_ledger_entries e WHERE e.entry_date=d::date AND e.direction='OUT' AND (${classify})='SMALL' AND ${operational}),0)::text spent
  FROM generate_series($1::date,$2::date,'1 day'::interval) d LEFT JOIN cash_daily_budgets b ON b.budget_date=d::date ORDER BY d`,[from,to])).rows;
  return {from,to,totals,rows,budgets};
 });
}
export type CashReport=Awaited<ReturnType<typeof cashReport>>;
export async function setDailyBudget(date:string,amount:number,reason:string,actor:string){
 if(!day(date)||!Number.isSafeInteger(amount)||amount<0||amount>1e12||reason.trim().length<5||reason.length>400)throw new BusinessError("Anggaran atau alasan tidak valid.");
 await transaction(async c=>{
  await c.query("LOCK TABLE cash_daily_budgets IN SHARE ROW EXCLUSIVE MODE");
  const old=await c.query<{amount:string}>("SELECT amount::text FROM cash_daily_budgets WHERE budget_date=$1",[date]);
  await c.query("INSERT INTO cash_daily_budgets(budget_date,amount,updated_by) VALUES($1,$2,$3) ON CONFLICT(budget_date) DO UPDATE SET amount=EXCLUDED.amount,updated_by=EXCLUDED.updated_by,updated_at=now()",[date,amount,actor]);
  await c.query("INSERT INTO cash_daily_budget_audit(budget_date,previous_amount,next_amount,reason,actor_id) VALUES($1,$2,$3,$4,$5)",[date,old.rows[0]?.amount??null,amount,reason.trim(),actor]);
 });
}
