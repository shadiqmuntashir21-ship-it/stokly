import {query} from "@/lib/db";
import type {SeriesPoint} from "@/components/business-charts";
type RawDay={day:string;amount:string};
export type OwnerAnalytics={
 points:SeriesPoint[];current:number;previous:number;range:7|30|90;source:"legacy"|"live";
 rankings:{name:string;value:number;orders:number}[];
 cashIn:number;cashOut:number;receipts:number;days:number;
};
function localToday(){
 return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function shiftDay(day:string,n:number){
 const d=new Date(day+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);
}
const number=(x:string|number|undefined)=>Number(x||0);
export async function ownerAnalytics(source:"legacy"|"live",range:7|30|90,custom?:{from:string;to:string}):Promise<OwnerAnalytics>{
 const today=custom?.to||localToday(),start=custom?.from||shiftDay(today,1-range);
 const days=Math.max(1,Math.min(730,Math.round((Date.parse(today+"T00:00:00Z")-Date.parse(start+"T00:00:00Z"))/86400000)+1));
 const effectiveStart=shiftDay(today,1-days),prevStart=shiftDay(effectiveStart,-days),prevEnd=shiftDay(effectiveStart,-1);
 const legacy=source==="legacy";
 const daily=legacy
  ?"SELECT issued_on::text AS day, COALESCE(SUM(gross-return_value),0)::text AS amount FROM legacy_receipts WHERE issued_on BETWEEN $1::date AND $2::date AND status<>'VOID' GROUP BY issued_on ORDER BY issued_on"
  :"SELECT d.delivered_on::text AS day,COALESCE(SUM(i.gross-COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0)),0)::text AS amount FROM delivery_notes d JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued' WHERE d.delivered_on BETWEEN $1::date AND $2::date GROUP BY d.delivered_on ORDER BY d.delivered_on";
 const ranking=legacy
  ?"SELECT outlet_name AS name, COUNT(*)::int AS orders, COALESCE(SUM(gross-return_value),0)::text AS value FROM legacy_receipts WHERE issued_on BETWEEN $1::date AND $2::date AND status<>'VOID' GROUP BY outlet_name ORDER BY SUM(gross-return_value) DESC LIMIT 5"
  :"SELECT o.name, COUNT(DISTINCT d.id)::int AS orders,COALESCE(SUM(i.gross-COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0)),0)::text AS value FROM delivery_notes d JOIN customer_orders co ON co.id=d.order_id JOIN outlets o ON o.id=co.outlet_id JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued' WHERE d.delivered_on BETWEEN $1::date AND $2::date GROUP BY o.id,o.name ORDER BY SUM(i.gross) DESC LIMIT 5";
 const [currentRows,priorRows,rankingRows,cashRows]=await Promise.all([
  query<RawDay>(daily,[effectiveStart,today]),
  query<RawDay>(daily,[prevStart,prevEnd]),
  query<{name:string;orders:number;value:string}>(ranking,[effectiveStart,today]),
  query<{direction:string;amount:string}>(`SELECT direction,COALESCE(SUM(amount),0)::text AS amount FROM cash_ledger_entries WHERE voided_at IS NULL AND entry_date BETWEEN $1::date AND $2::date AND category NOT LIKE 'KAS BESAR:%' AND category<>'PENJUALAN TRANSFER' GROUP BY direction`,[effectiveStart,today])
 ]);
 const byDay=new Map(currentRows.map(x=>[x.day,number(x.amount)]));
 const points:SeriesPoint[]=[];
 for(let i=0;i<days;i++){
  const day=shiftDay(effectiveStart,i);points.push({label:day.slice(8)+"/"+day.slice(5,7),value:byDay.get(day)||0});
 }
 let output=points;
 if(days>45){const step=days<=130?7:Math.ceil(days/28);output=[];for(let i=0;i<days;i+=step){
  const chunk=points.slice(i,i+step);output.push({label:chunk[0].label,value:chunk.reduce((a,b)=>a+b.value,0)});
 }}
 return {points:output,current:currentRows.reduce((a,b)=>a+number(b.amount),0),previous:priorRows.reduce((a,b)=>a+number(b.amount),0),range,source,
  rankings:rankingRows.map(r=>({name:r.name,value:number(r.value),orders:r.orders})),
  cashIn:cashRows.filter(r=>r.direction==="IN").reduce((a,b)=>a+number(b.amount),0),
  cashOut:cashRows.filter(r=>r.direction==="OUT").reduce((a,b)=>a+number(b.amount),0),
  receipts:rankingRows.reduce((a,b)=>a+b.orders,0),days};
}
export type AdminAnalytics={
 production:{label:string;used:number;damaged:number}[];
 products:{sku:string;name:string;unit:string;stock:number;threshold:number;shipped:number;produced:number}[];
 ordersToday:number;finishedToday:number;
};
export async function adminAnalytics():Promise<AdminAnalytics>{
 const today=localToday(),start=shiftDay(today,-6);
 const [days,products,orders]=await Promise.all([
  query<{day:string;used:string;damaged:string}>("SELECT production_date::text AS day,COALESCE(SUM(coconut_used),0)::text AS used,COALESCE(SUM(damaged_qty),0)::text AS damaged FROM coconut_production_days WHERE production_date BETWEEN $1::date AND $2::date GROUP BY production_date",[start,today]),
  query<{sku:string;name:string;unit:string;stock:number;threshold:number;shipped:string;produced:string}>(`SELECT p.sku,p.name,p.unit,COALESCE(b.quantity,0)::int AS stock,p.min_stock::int AS threshold,COALESCE((SELECT SUM(di.quantity) FROM delivery_note_items di JOIN customer_order_items oi ON oi.id=di.order_item_id JOIN delivery_notes d ON d.id=di.delivery_id WHERE oi.product_id=p.id AND d.delivered_on BETWEEN $1::date AND $2::date),0)::text AS shipped,COALESCE((SELECT SUM(o.quantity) FROM coconut_production_day_outputs o JOIN coconut_production_days pd ON pd.id=o.production_id WHERE o.product_id=p.id AND pd.production_date BETWEEN $1::date AND $2::date),0)::text AS produced FROM products p LEFT JOIN inventory_balances b ON b.product_id=p.id WHERE p.active=true AND p.sku IN ('GO-MAKAN-FULL','GO-KELAPA-TAR','GO-SERUT') ORDER BY CASE p.sku WHEN 'GO-MAKAN-FULL' THEN 1 WHEN 'GO-KELAPA-TAR' THEN 2 ELSE 3 END`,[start,today]),
  query<{qty:number}>("SELECT COUNT(*)::int AS qty FROM customer_orders WHERE ordered_on=$1::date AND status!='cancelled'",[today])
 ]);
 const map=new Map(days.map(x=>[x.day,x]));
 const production=[];for(let i=0;i<7;i++){const d=shiftDay(start,i),r=map.get(d);production.push({label:d.slice(8)+"/"+d.slice(5,7),used:number(r?.used),damaged:number(r?.damaged)});}
 return {production,products:products.map(p=>({...p,shipped:number(p.shipped),produced:number(p.produced)})),ordersToday:orders[0]?.qty||0,finishedToday:production[6]?.used||0};
}
