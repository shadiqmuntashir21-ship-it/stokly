import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
const uuid=(x:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const date=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x);
const costOK=(n:number)=>Number.isFinite(n)&&n>0&&n<=1e12&&Number.isSafeInteger(Math.round(n*100));
export async function listRoutes(){
 return query<{id:string;title:string;route_date:string;vehicle:string;driver:string;distance_km:string|null;stops:number;cost:string;revenue:string}>(
 `SELECT r.id::text,r.title,r.route_date::text,r.vehicle,r.driver,r.distance_km::text,
 (SELECT COUNT(*)::int FROM delivery_route_stops s WHERE s.route_id=r.id) stops,
 (SELECT COALESCE(SUM(c.amount),0)::text FROM delivery_route_costs c WHERE c.route_id=r.id) cost,
 (SELECT COALESCE(SUM(i.gross-COALESCE((SELECT SUM(x.credit_amount) FROM delivery_returns x WHERE x.delivery_id=d.id),0)),0)::text
 FROM delivery_route_stops s JOIN delivery_notes d ON d.id=s.delivery_id
 JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued' WHERE s.route_id=r.id) revenue
 FROM delivery_routes r ORDER BY r.route_date DESC,r.created_at DESC LIMIT 60`);
}
export async function listAvailableDeliveries(){
 return query<{id:string;document_number:string;outlet:string;date:string;gross:string}>(
 `SELECT d.id::text,d.document_number,o.name outlet,d.delivered_on::text date,
 (i.gross-COALESCE((SELECT SUM(x.credit_amount) FROM delivery_returns x WHERE x.delivery_id=d.id),0))::text gross
 FROM delivery_notes d JOIN delivery_invoices i ON i.delivery_id=d.id
 JOIN customer_orders co ON co.id=d.order_id JOIN outlets o ON o.id=co.outlet_id
 WHERE i.status='issued' AND NOT EXISTS(SELECT 1 FROM delivery_route_stops s WHERE s.delivery_id=d.id)
 ORDER BY d.created_at DESC LIMIT 150`);
}
export async function routeAllocations(){
 const rows=await query<{route_id:string;route_title:string;document_number:string;outlet:string;stop_order:number;net:string;route_cost:string}>(
 `SELECT r.id::text route_id,r.title route_title,d.document_number,o.name outlet,s.stop_order,
 (i.gross-COALESCE((SELECT SUM(x.credit_amount) FROM delivery_returns x WHERE x.delivery_id=d.id),0))::text net,
 (SELECT COALESCE(SUM(c.amount),0)::text FROM delivery_route_costs c WHERE c.route_id=r.id) route_cost
 FROM delivery_route_stops s JOIN delivery_routes r ON r.id=s.route_id
 JOIN delivery_notes d ON d.id=s.delivery_id JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued'
 JOIN customer_orders co ON co.id=d.order_id JOIN outlets o ON o.id=co.outlet_id
 ORDER BY r.route_date DESC,r.id,s.stop_order LIMIT 250`);
 const groups=new Map<string,typeof rows>();
 for(const row of rows){const g=groups.get(row.route_id)||[];g.push(row);groups.set(row.route_id,g);}
 const result:{routeId:string;routeTitle:string;outlet:string;documentNumber:string;stop:number;revenue:number;allocatedCost:number;afterDelivery:number}[]=[];
 for(const [routeId,group] of groups){
  const cents=Math.round(Number(group[0].route_cost)*100);
  const nets=group.map(x=>Math.max(0,Math.round(Number(x.net)*100)));
  const weight=nets.reduce((a,b)=>a+b,0);
  const raw=nets.map(x=>weight>0?cents*x/weight:cents/group.length);
  const floors=raw.map(Math.floor);
  const remainder=cents-floors.reduce((a,b)=>a+b,0);
  const sorted=raw.map((v,i)=>({i,frac:v-Math.floor(v)})).sort((a,b)=>b.frac-a.frac||a.i-b.i);
  for(let j=0;j<remainder;j++)floors[sorted[j%sorted.length].i]++;
  group.forEach((x,i)=>{const revenue=Math.round(Number(x.net)*100)/100,allocatedCost=floors[i]/100;
   result.push({routeId,routeTitle:x.route_title,outlet:x.outlet,documentNumber:x.document_number,stop:x.stop_order,revenue,allocatedCost,afterDelivery:revenue-allocatedCost});
  });
 }
 return result;
}
export async function createRoute(data:{requestKey:string;title:string;date:string;vehicle:string;driver:string;distance:number|null;note:string},actor:string){
 if(!uuid(data.requestKey)||data.title.trim().length<3||!date(data.date)||
 (data.distance!==null&&(!Number.isFinite(data.distance)||data.distance<0||data.distance>100000)))
 throw new BusinessError("Data rute tidak valid.");
 await query(`INSERT INTO delivery_routes(request_key,title,route_date,vehicle,driver,distance_km,note,created_by)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(request_key) DO NOTHING`,
 [data.requestKey,data.title.trim().slice(0,140),data.date,data.vehicle.trim().slice(0,100),data.driver.trim().slice(0,120),data.distance,data.note.trim().slice(0,400),actor]);
}
export async function attachDelivery(routeId:string,deliveryId:string,stopOrder:number,actor:string){
 if(!uuid(routeId)||!uuid(deliveryId)||!Number.isSafeInteger(stopOrder)||stopOrder<1||stopOrder>500)throw new BusinessError("Data stop rute tidak valid.");
 await transaction(async c=>{
  const route=await c.query("SELECT id FROM delivery_routes WHERE id=$1 FOR UPDATE",[routeId]);
  if(!route.rowCount)throw new BusinessError("Rute tidak ditemukan.");
  const delivery=await c.query("SELECT 1 FROM delivery_invoices WHERE delivery_id=$1 AND status='issued'",[deliveryId]);
  if(!delivery.rowCount)throw new BusinessError("Nota pengiriman tidak ditemukan.");
  await c.query("INSERT INTO delivery_route_stops(route_id,delivery_id,stop_order) VALUES($1,$2,$3)",[routeId,deliveryId,stopOrder]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'route.stop','delivery_route',$2)",[actor,routeId]);
 });
}
export async function recordRouteCost(data:{requestKey:string;routeId:string;category:string;amount:number;note:string},actor:string){
 if(!uuid(data.requestKey)||!uuid(data.routeId)||!["fuel","driver","toll","parking","vehicle","other"].includes(data.category)||
 !costOK(data.amount))throw new BusinessError("Biaya rute tidak valid.");
 await query(`INSERT INTO delivery_route_costs(request_key,route_id,category,amount,note,created_by)
 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(request_key) DO NOTHING`,
 [data.requestKey,data.routeId,data.category,Math.round(data.amount*100)/100,data.note.trim().slice(0,400),actor]);
}
