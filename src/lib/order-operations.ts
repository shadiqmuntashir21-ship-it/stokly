import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";

const uuid=(x:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const positive=(n:number)=>Number.isSafeInteger(n)&&n>0&&n<=100000000;
const validDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d);
const cents=(n:number)=>Math.round(n*100);
const validPrice=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1e12&&Number.isSafeInteger(cents(n));

type OrderItem={productId:string;quantity:number;unitPrice:number|null};
type DispatchItem={orderItemId:string;quantity:number};

export async function receiptNumberReady(){
 const rows=await query<{ready:boolean}>("SELECT EXISTS(SELECT 1 FROM receipt_number_settings WHERE singleton=true AND next_number BETWEEN 1 AND 9999999) AS ready");
 return !!rows[0]?.ready;
}

export async function listOrders(){
 return query<{id:string;document_number:string|null;outlet:string;ordered_on:string;status:string;items:number;total:string;shipped:number}>(
 "SELECT o.id::text,o.document_number,t.name AS outlet,o.ordered_on::text,o.status,COALESCE(SUM(i.quantity),0)::int AS items,COALESCE(SUM(i.quantity*i.unit_price),0)::text AS total,COALESCE((SELECT SUM(di.quantity)::int FROM delivery_notes dn JOIN delivery_note_items di ON di.delivery_id=dn.id WHERE dn.order_id=o.id),0)::int AS shipped FROM customer_orders o JOIN outlets t ON t.id=o.outlet_id JOIN customer_order_items i ON i.order_id=o.id GROUP BY o.id,t.name ORDER BY o.created_at DESC LIMIT 100"
 ¶»§q«^