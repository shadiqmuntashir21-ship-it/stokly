import {query} from "@/lib/db";
export type OwnerOperations={open_orders:number;partial_orders:number;uninspected_batches:number;uninspected_pcs:number;ready_batches:number;open_complaints:number;low_stock:number;pending_cost_runs:number};
export async function ownerOperations():Promise<OwnerOperations>{
 const rows=await query<OwnerOperations>(`SELECT
 (SELECT COUNT(*)::int FROM customer_orders WHERE status='confirmed') AS open_orders,
 (SELECT COUNT(*)::int FROM customer_orders WHERE status='partially_delivered') AS partial_orders,
 (SELECT COUNT(*)::int FROM coconut_batches WHERE received_qty>accepted_qty+rejected_qty) AS uninspected_batches,
 (SELECT COALESCE(SUM(received_qty-accepted_qty-rejected_qty),0)::int FROM coconut_batches WHERE received_qty>accepted_qty+rejected_qty) AS uninspected_pcs,
 (SELECT COUNT(*)::int FROM coconut_batches WHERE accepted_qty>consumed_qty) AS ready_batches,
 (SELECT COUNT(*)::int FROM outlet_complaints WHERE status IN('open','investigating')) AS open_complaints,
 (SELECT COUNT(*)::int FROM inventory_balances b JOIN products p ON p.id=b.product_id WHERE p.active=true AND b.quantity<=p.min_stock) AS low_stock,
 (SELECT COUNT(*)::int FROM coconut_production pr WHERE
  NOT EXISTS(SELECT 1 FROM coconut_batches b WHERE b.id=pr.batch_id AND b.received_qty=b.accepted_qty+b.rejected_qty AND b.accepted_qty>0)
  OR EXISTS (SELECT 1 FROM coconut_production_outputs out WHERE out.production_id=pr.id
   AND NOT EXISTS(SELECT 1 FROM production_cost_shares s WHERE s.production_id=out.production_id AND s.product_id=out.product_id))
  OR 100<>COALESCE((SELECT SUM(s.share_pct) FROM production_cost_shares s WHERE s.production_id=pr.id),0)) AS pending_cost_runs`);
 return rows[0];
}
export type OwnerEvent={action:string;entity:string;created_at:Date;actor_id:string;entity_id:string};
export async function ownerActivity(limit=40):Promise<OwnerEvent[]>{
 return query<OwnerEvent>("SELECT action,entity,created_at,actor_id,entity_id::text FROM activity_logs ORDER BY created_at DESC LIMIT $1",[Math.max(1,Math.min(100,limit))]);
}
