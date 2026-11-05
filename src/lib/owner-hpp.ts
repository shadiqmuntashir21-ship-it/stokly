import {query} from "@/lib/db";
export type ProductHpp={product_id:string;product:string;unit:string;produced_qty:number;allocated_cost:string;hpp_unit:string;production_count:number};
export async function ownerProductHpp():Promise<ProductHpp[]>{
 return query<ProductHpp>(`WITH completed_runs AS (
 SELECT pr.id,pr.coconut_used,r.total_value,b.accepted_qty,
 COALESCE((SELECT SUM(e.amount) FROM expense_entries e JOIN expense_categories cat ON cat.code=e.category_code WHERE e.production_id=pr.id AND cat.cost_class='production'),0) AS other_cost
 FROM coconut_production pr JOIN coconut_batches b ON b.id=pr.batch_id JOIN coconut_receipts r ON r.id=b.receipt_id
 WHERE b.accepted_qty>0 AND b.received_qty=b.accepted_qty+b.rejected_qty
 AND (SELECT COUNT(*) FROM coconut_production_outputs o WHERE o.production_id=pr.id)>0
 AND (SELECT COUNT(*) FROM production_cost_shares s WHERE s.production_id=pr.id)=(SELECT COUNT(*) FROM coconut_production_outputs o WHERE o.production_id=pr.id)
 AND (SELECT COALESCE(SUM(s.share_pct),0) FROM production_cost_shares s WHERE s.production_id=pr.id)=100
 ), items AS (
 SELECT out.product_id,out.produced_qty,
 ((run.total_value*run.coconut_used::numeric/run.accepted_qty)+run.other_cost)*s.share_pct/100 AS allocated,
 run.id AS production_id FROM completed_runs run
 JOIN coconut_production_outputs out ON out.production_id=run.id
 JOIN production_cost_shares s ON s.production_id=out.production_id AND s.product_id=out.product_id
 )
 SELECT p.id::text product_id,p.name product,p.unit,SUM(i.produced_qty)::int produced_qty,
 ROUND(SUM(i.allocated),2)::text allocated_cost,
 ROUND(SUM(i.allocated)/NULLIF(SUM(i.produced_qty),0),2)::text hpp_unit,
 COUNT(DISTINCT i.production_id)::int production_count
 FROM items i JOIN products p ON p.id=i.product_id GROUP BY p.id,p.name,p.unit ORDER BY p.name`);
}
export type CostReadiness={production_runs:number;finished_runs:number;incomplete_runs:number;units_without_cost:number};
export async function ownerCostReadiness():Promise<CostReadiness>{
 const rows=await query<CostReadiness>(`SELECT
 COUNT(*)::int production_runs,
 COUNT(*) FILTER(WHERE b.accepted_qty>0 AND b.received_qty=b.accepted_qty+b.rejected_qty
 AND COALESCE((SELECT SUM(share_pct) FROM production_cost_shares s WHERE s.production_id=pr.id),0)=100
 AND (SELECT COUNT(*) FROM production_cost_shares s WHERE s.production_id=pr.id)=(SELECT COUNT(*) FROM coconut_production_outputs o WHERE o.production_id=pr.id))::int finished_runs,
 COUNT(*) FILTER(WHERE NOT (b.accepted_qty>0 AND b.received_qty=b.accepted_qty+b.rejected_qty
 AND COALESCE((SELECT SUM(share_pct) FROM production_cost_shares s WHERE s.production_id=pr.id),0)=100
 AND (SELECT COUNT(*) FROM production_cost_shares s WHERE s.production_id=pr.id)=(SELECT COUNT(*) FROM coconut_production_outputs o WHERE o.production_id=pr.id)))::int incomplete_runs,
 (SELECT COUNT(*)::int FROM delivery_note_items di WHERE NOT EXISTS(
   SELECT 1 FROM coconut_production_outputs out WHERE out.product_id=(SELECT oi.product_id FROM customer_order_items oi WHERE oi.id=di.order_item_id)
 ))::int units_without_cost
 FROM coconut_production pr JOIN coconut_batches b ON b.id=pr.batch_id`);
 return rows[0];
}
