import {query} from "@/lib/db";
import type {Period} from "@/lib/owner-money";
export type OutletRow={id:string;name:string;group_name:string;orders:number;shipments:number;gross:string;credits:string;received:string;due:string;last_order:string|null};
export async function ownerOutlets(period:Period):Promise<OutletRow[]>{
 return query<OutletRow>(`SELECT o.id::text,o.name,COALESCE(g.name,'—') AS group_name,
 (SELECT COUNT(*)::int FROM customer_orders c WHERE c.outlet_id=o.id AND c.status!='cancelled' AND ($1::date IS NULL OR c.ordered_on>=$1) AND ($2::date IS NULL OR c.ordered_on<=$2)) AS orders,
 (SELECT COUNT(*)::int FROM delivery_notes d JOIN customer_orders c ON c.id=d.order_id WHERE c.outlet_id=o.id AND ($1::date IS NULL OR d.delivered_on>=$1) AND ($2::date IS NULL OR d.delivered_on<=$2)) AS shipments,
 (SELECT COALESCE(SUM(i.gross),0)::text FROM delivery_notes d JOIN customer_orders c ON c.id=d.order_id JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued' WHERE c.outlet_id=o.id AND ($1::date IS NULL OR d.delivered_on>=$1) AND ($2::date IS NULL OR d.delivered_on<=$2)) AS gross,
 (SELECT COALESCE(SUM(r.credit_amount),0)::text FROM delivery_notes d JOIN customer_orders c ON c.id=d.order_id JOIN delivery_returns r ON r.delivery_id=d.id WHERE c.outlet_id=o.id AND ($1::date IS NULL OR d.delivered_on>=$1) AND ($2::date IS NULL OR d.delivered_on<=$2)) AS credits,
 (SELECT COALESCE(SUM(p.amount),0)::text FROM delivery_notes d JOIN customer_orders c ON c.id=d.order_id JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued' JOIN delivery_payments p ON p.invoice_id=i.id WHERE c.outlet_id=o.id AND ($1::date IS NULL OR (p.paid_at AT TIME ZONE 'Asia/Makassar')::date>=$1) AND ($2::date IS NULL OR (p.paid_at AT TIME ZONE 'Asia/Makassar')::date<=$2)) AS received,
 (SELECT COALESCE(SUM(GREATEST(0,i.gross-COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=i.delivery_id),0)-COALESCE((SELECT SUM(p.amount) FROM delivery_payments p WHERE p.invoice_id=i.id),0))),0)::text FROM delivery_invoices i JOIN delivery_notes d ON d.id=i.delivery_id JOIN customer_orders c ON c.id=d.order_id WHERE c.outlet_id=o.id AND i.status='issued') AS due,
 (SELECT MAX(c.ordered_on)::text FROM customer_orders c WHERE c.outlet_id=o.id AND c.status!='cancelled') AS last_order
 FROM outlets o LEFT JOIN outlet_groups g ON g.id=o.group_id WHERE o.active=true ORDER BY o.name LIMIT 200`,[period.from,period.to]);
}
