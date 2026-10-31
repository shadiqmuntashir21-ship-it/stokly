import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
const uuid=(x:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export type CostLine={production_id:string;production_date:string;product_id:string;product:string;unit:string;produced_qty:number;share_pct:string|null;raw_cost:string|null;other_cost:string;qc_complete:boolean;};
export async function listProductionCosts(){
 return query<CostLine>(`SELECT pr.id::text production_id, pr.production_date::text,p.id::text product_id,
 p.name product,p.unit,o.produced_qty,s.share_pct::text,
 CASE WHEN b.accepted_qty>0 AND b.received_qty=b.accepted_qty+b.rejected_qty
  THEN (r.total_value*pr.coconut_used::numeric/b.accepted_qty)::text ELSE NULL END raw_cost,
 (SELECT COALESCE(SUM(e.amount),0)::text FROM expense_entries e JOIN expense_categories ec ON ec.code=e.category_code
   WHERE e.production_id=pr.id AND ec.cost_class='production') other_cost,
 (b.accepted_qty>0 AND b.received_qty=b.accepted_qty+b.rejected_qty) qc_complete
 FROM coconut_production pr
 JOIN coconut_batches b ON b.id=pr.batch_id JOIN coconut_receipts r ON r.id=b.receipt_id
 JOIN coconut_production_outputs o ON o.production_id=pr.id JOIN products p ON p.id=o.product_id
 LEFT JOIN production_cost_shares s ON s.production_id=pr.id AND s.product_id=o.product_id
 ORDER BY pr.created_at DESC,p.name LIMIT 250`);
}
export async function assignCostShares(productionId:string,shares:{productId:string;percent:number}[],actor:string){
 if(!uuid(productionId)||!shares.length||shares.length>30||shares.some(x=>!uuid(x.productId)||!Number.isFinite(x.percent)||x.percent<=0||x.percent>100)||
 new Set(shares.map(x=>x.productId)).size!==shares.length)
 throw new BusinessError("Alokasi biaya produksi tidak valid.");
 const cents=shares.map(s=>Math.round(s.percent*100));
 if(cents.some(x=>x<=0)||cents.reduce((a,b)=>a+b,0)!==10000)
 throw new BusinessError("Total pembagian biaya seluruh produk harus tepat 100%.");
 await transaction(async c=>{
  const run=await c.query("SELECT id FROM coconut_production WHERE id=$1 FOR UPDATE",[productionId]);
  if(!run.rowCount)throw new BusinessError("Batch produksi tidak ditemukan.");
  const outputs=await c.query<{product_id:string}>("SELECT product_id::text FROM coconut_production_outputs WHERE production_id=$1",[productionId]);
  if(outputs.rowCount!==shares.length||outputs.rows.some(x=>!shares.some(s=>s.productId===x.product_id)))
   throw new BusinessError("Semua hasil produksi harus diberi persentase alokasi.");
  for(let i=0;i<shares.length;i++){
   await c.query(`INSERT INTO production_cost_shares(production_id,product_id,share_pct,updated_by)
    VALUES($1,$2,$3,$4) ON CONFLICT(production_id,product_id)
    DO UPDATE SET share_pct=EXCLUDED.share_pct,updated_by=EXCLUDED.updated_by,updated_at=now()`,
   [productionId,shares[i].productId,cents[i]/100,actor]);
  }
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'production.cost.allocate','production',$2)",[actor,productionId]);
 });
}
