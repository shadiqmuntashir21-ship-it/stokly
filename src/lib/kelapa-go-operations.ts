import {randomUUID} from "node:crypto";
import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";

const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const day=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
const count=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<10000000;
const price=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1000000000&&Number.isSafeInteger(Math.round(n*100));
export type PurchaseLine={gradeId:string;quantity:number;unitPrice:number;passed:number;rejected:number};
export async function recordCombinedPurchase(input:{requestKey:string;supplierId:string;date:string;note:string;lines:PurchaseLine[]},actor:string){
 if(!uuid(input.requestKey)||!uuid(input.supplierId)||!day(input.date)||!Array.isArray(input.lines)||
 input.lines.length<1||input.lines.length>15||input.lines.some(x=>!uuid(x.gradeId)||!count(x.quantity)||x.quantity<1||
 (!price(x.unitPrice)||x.unitPrice<=0)||!count(x.passed)||!count(x.rejected)||x.passed+x.rejected>x.quantity)||
 new Set(input.lines.map(x=>x.gradeId)).size!==input.lines.length)throw new BusinessError("Periksa grade, jumlah, harga dan hasil QC. QC tidak boleh melebihi pembelian.");
 return transaction(async c=>{
  const old=await c.query<{id:string}>("SELECT id::text FROM kelapa_go_purchase_groups WHERE request_key=$1",[input.requestKey]);
  if(old.rows[0])return old.rows[0].id;
  const supplier=await c.query("SELECT id FROM supp¶»§q«^