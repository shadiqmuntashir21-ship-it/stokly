import { query } from "@/lib/db";
import { BusinessError } from "@/lib/operations";
const uuid=(x:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
export async function listExpenseCategories(){
 return query<{code:string;name:string;cost_class:string}>("SELECT code,name,cost_class FROM expense_categories ORDER BY cost_class,name");
}
export async function listExpenses(){
 return query<{id:string;incurred_on:string;name:string;cost_class:string;amount:string;note:string;outlet:string|null}>(
  "SELECT e.id::text,e.incurred_on::text,c.name,c.cost_class,e.amount::text,e.note,o.name outlet FROM expense_entries e JOIN expense_categories c ON c.code=e.category_code LEFT JOIN outlets o ON o.id=e.outlet_id ORDER BY e.incurred_on DESC,e.created_at DESC LIMIT 100");
}
export async function addExpense(data:{requestKey:string;category:string;amount:number;date:string;note:string;outletId:string;productionId:string},actor:string){
 if(!uuid(data.requestKey)||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||data.note.trim().length<5||
 !Number.isFinite(data.amount)||data.amount<=0||data.amount>1e12||
 !Number.isSafeInteger(Math.round(data.amount*100))||
 (data.outletId&&!uuid(data.outletId))||(data.productionId&&!uuid(data.productionId)))throw new BusinessError("Data pengeluaran tidak valid.");
 const cat=await query<{cost_class:string}>("SELECT cost_class FROM expense_categories WHERE code=$1",[data.category]);
 if(!cat[0])throw new BusinessError("Kategori biaya tidak ditemukan.");
 if(data.productionId&&cat[0].cost_class!=="production")throw new BusinessError("Hanya biaya produksi dapat ditautkan ke batch produksi.");
 if(data.outletId&&cat[0].cost_class!=="delivery")throw new BusinessError("Hanya biaya pengiriman dapat ditautkan ke outlet.");
 await query("INSERT INTO expense_entries(request_key,category_code,amount,incurred_on,production_id,outlet_id,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(request_key) DO NOTHING",
 [data.requestKey,data.category,Math.round(data.amount*100)/100,data.date,data.productionId||null,data.outletId||null,data.note.trim().slice(0,400),actor]);
}
export async function financeSnapshot(){
 const [invoice,purchases,costs]=await Promise.all([
  query<{gross:string;paid:string}>(`SELECT COALESCE((SELECT SUM(gross) FROM delivery_invoices WHERE status='issued'),0)::text gross,
  COALESCE((SELECT SUM(p.amount) FROM delivery_payments p JOIN delivery_invoices i ON i.id=p.invoice_id WHERE i.status='issued'),0)::text paid`),
  query<{total:string}>(`SELECT COALESCE(SUM(total_value),0)::text total FROM coconut_receipts`),
  query<{cost_class:string;total:string}>(`SELECT c.cost_class,COALESCE(SUM(e.amount),0)::text total FROM expense_entries e JOIN expense_categories c ON c.code=e.category_code GROUP BY c.cost_class`)
 ]);
 return {gross:Number(invoice[0]?.gross||0),paid:Number(invoice[0]?.paid||0),purchases:Number(purchases[0]?.total||0),costs:costs.map(c=>({className:c.cost_class,amount:Number(c.total)}))};
}
