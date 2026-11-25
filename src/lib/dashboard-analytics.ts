import {query} from "@/lib/db";
import type {SeriesPoint} from "@/components/business-charts";
type RawDay={day:string;amount:string;receipts:number};
export type OwnerAnalytics={
 points:SeriesPoint[];current:number;previous:number;range:1|7|30|90;from:string;to:string;source:"legacy"|"live";
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
export function salesPeriod(range:1|7|30|90,custom?:{from:string;to:string}){
 const to=custom?.to||localToday(),from=custom?.from||shiftDay(to,1-range);
 const valid=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+"T00:00:00Z"))&&new Date(d+"T00:00:00Z").toISOString().slice(0,10)===d;
 if(!valid(from)||!valid(to)||from>to||(Date.parse(to)-Date.parse(from))/86400000>729)throw new Error("Rentang laporan maksimal 730 hari dan harus valid.");
 return {from,to};
}
export const salesBase=(source:"legacy"|"live")=>source==="legacy"
 ?"SELECT r.issued_on AS day,r.document_number AS number,r.outlet_name AS outlet,r.quantity AS quantity,r.gross,r.return_value AS returned,r.gross-r.return_value AS net FROM legacy_receipts r WHERE r.issued_on BETWEEN $1::date AND $2::date AND r.status<>'VOID'"
 :"SELECT d.delivered_on AS day,d.document_number AS number,o.name AS outlet,COALESCE((SELECT SUM(di.quantity) FROM delivery_note_items di WHERE di.delivery_id=d.id),0)::int AS quantity,i.gross,COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0) AS returned,i.gross-COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0) AS net FROM delivery_notes d JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued' JOIN customer_orders co ON co.id=d.order_id JOIN outlets o ON o.id=co.outlet_id WHERE d.delivered_on BETWEEN $1::date AND $2::date";
export async function ownerAnalytics(source:"legacy"|"live",range:1|7|30|90,custom?:{from:string;to:string}):Promise<OwnerAnalytics>{
 let period;try{period=salesPeriod(range,custom);}catch{period=salesPeriod(range);}
 const today=period.to,effectiveStart=period.from,days=Math.round((Date.parse(today)-Date.parse(effectiveStart))/86400000)+1,prevStart=shiftDay(effectiveStart,-days),prevEnd=shiftDay(effectiveStart,-1);
 const base=salesBase(source);
 const daily="SELECT day::text,COALESCE(SUM(net),0)::text amount,COUNT(*)::int receipts FROM ("+base+") sales GROUP BY day ORDER BY day";
 const ranking="SELECT outlet AS name,COUNT(*)::int orders,COALESCE(SUM(net),0)::text value FROM ("+base+") sales GROUP BY outlet ORDER BY SUM(net) DESC,outlet LIMIT 5";
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
 return {points:output,current:currentRows.reduce((a,b)=>a+number(b.amount),0),previous:priorRows.reduce((a,b)=>a+number(b.amount),0),range,source,from:effectiveStart,to:today,
  rankings:rankingRows.map(r=>({name:r.name,value:number(r.value),orders:r.orders})),
  cashIn:cashRows.filter(r=>r.direction==="IN").reduce((a,b)=>a+number(b.amount),0),
  cashOut:cashRows.filter(r=>r.direction==="OUT").reduce((a,b)=>a+number(b.amount),0),
  receipts:currentRows.reduce((a,b)=>a+b.receipts,0),days};
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
