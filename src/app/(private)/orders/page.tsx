import {randomUUID} from "node:crypto";
import Link from "next/link";
import {query} from "@/lib/db";
import {requireActor} from "@/lib/access";
import {listProducts} from "@/lib/operations";
import {outlets} from "@/lib/v2-master";
import {listOrders,listOrderLines,receiptNumberReady} from "@/lib/order-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {OrderComposer} from "@/components/order-composer";
import {DispatchComposer} from "@/components/dispatch-composer";
export const dynamic="force-dynamic";
export default async function Orders({searchParams}:{searchParams:Promise<{success?:string;error?:string;repeat?:string;dispatch?:string;receipt?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const [products,outletList,orders,lines,ready,params]=await Promise.all([listProducts(),outlets(),listOrders(),listOrderLines(),receiptNumberReady(),searchParams]);
 const remaining=lines.filter(x=>x.quantity>x.shipped);
 const original=orders.find(o=>o.id===params.repeat);
 const repeat=original?await query<{productId:string;quantity:number}>("SELECT product_id::text AS \"productId\",quantity FROM customer_order_items WHERE order_id=$1 ORDER BY id",[original.id]):[];
 const initialOutlet=original?(await query<{outlet_id:string}>("SELECT outlet_id::text FROM customer_orders WHERE id=$1",[original.id]))[0]?.outlet_id:"";
 const initialItems=repeat.map(x=>({productId:x.productId,quantity:x.quantity,unitPrice:null}));

 re¶»§q«^