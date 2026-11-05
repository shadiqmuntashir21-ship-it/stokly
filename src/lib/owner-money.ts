import {query} from "@/lib/db";
export type Period={from:string|null;to:string|null};
export function parsePeriod(a?:string,b?:string):Period{
 const valid=(s?:string)=>!!s&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
 const from=valid(a)?a!:null,to=valid(b)?b!:null;
 return from&&to&&from>to?{from:to,to:from}:{from,to};
}
export type OwnerMoney={orders:number;shipments:number;gross:string;returned:string;payments:string;expenses:string;route_costs:string;outstanding:string;unpaid_invoices:number;refunds:string;refund_pending_count:number};
export async function ownerMoney(period:Period):Promise<OwnerMoney>{
 const sql=`SELECT
 (SELECT COUNT(*)::int FROM customer_orders o WHERE o.status!='cancelled' AND ($1::date IS NULL OR o.ordered_on>=$1) AND ($2::date IS NULL OR o.ordered_on<=$2)) AS orders,
 (SELECT COUNT(*)::int FROM delivery_notes d WHERE ($1::date IS NULL OR d.delivered_on>=$1) AND ($2::date IS NULL OR d.delivered_on<=$2)) AS shipments,
 (SELECT COALESCE(SUM(i.gross),0)::text FROM delivery_invoices i JOIN delivery_notes d ON d.id=i.delivery_id WHERE i.status='issued' AND ($1::date IS NULL OR d.delivered_on>=$1) AND ($2::date IS NULL OR d.delivered_on<=$2)) AS gross,
 (SELECT COALESCE(SUM(r.credit_amount),0)::text FROM delivery_returns r JOIN delivery_notes d ON d.id=r.delivery_id JOIN delivery_invoices i ON i.delivery_id=d.id WHERE i.status='issued' AND ($1::date IS NULL OR d.delivered_on>=$1) AND ($2::date IS NULL OR d.delivered_on<=$2)) AS returned,
 (SELECT COALESCE(SUM(p.amount),0)::text FROM delivery_payments p JOIN delivery_invoices i ON i.id=p.invoice_id WHERE i.status='issued' AND ($1::date IS NULL OR (p.paid_at AT TIME ZONE 'Asia/Makassar')::date>=$1) AND ($2::date IS NULL OR (p.paid_at AT TIME ZONE 'Asia/Makassar')::date<=$2)) AS payments,
 (SELECT COALESCE(SUM(e.amount),0)::text FROM expense_entries e WHERE ($1::date IS NULL OR e.incurred_on>=$1) AND ($2::date IS NULL OR e.incurred_on<=$2)) AS expenses,
 (SELECT COALESCE(SUM(c.amount),0)::text FROM delivery_route_costs c JOIN delivery_routes r ON r.id=c.route_id WHERE ($1::date IS NULL OR r.route_date>=$1) AND ($2::date IS NULL OR r.route_date<=$2)) AS route_costs,
 (SELECT GREATEST(0,COALESCE(SUM(i.gross),0)-COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r JOIN delivery_invoices j ON j.delivery_id=r.delivery_id WHERE j.status='issued'),0)-COALESCE((SELECT SUM(p.amount) FROM delivery_payments p JOIN delivery_invoices j ON j.id=p.invoice_id WHERE j.status='issued'),0))::text FROM delivery_invoices i WHERE i.status='issued') AS outstanding,
 (SELECT COUNT(*)::int FROM (SELECT i.id,i.gross-COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=i.delivery_id),0)-COALESCE((SELECT SUM(p.amount) FROM delivery_payments p WHERE p.invoice_id=i.id),0) AS due FROM delivery_invoices i WHERE i.status='issued') t WHERE due>0) AS unpaid_invoices,
 (SELECT COALESCE(SUM(amount),0)::text FROM delivery_refund_obligations WHERE status='pending') AS refunds,
 (SELECT COUNT(*)::int FROM delivery_refund_obligations WHERE status='pending') AS refund_pending_count`;
 return (await query<OwnerMoney>(sql,[period.from,period.to]))[0];
}
