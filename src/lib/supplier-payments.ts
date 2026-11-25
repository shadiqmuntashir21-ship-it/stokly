import {createHash} from "node:crypto";
import type {PoolClient} from "pg";
import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
import {toCents,validPaymentAmount,paymentSplitValid} from "./purchase-payment-math";
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const day=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export type PurchasePaymentSummary={group_id:string;received_date:string;supplier_id:string;supplier_name:string;payment_tracking:boolean;total:string;paid:string;due:string|null;active_lines:number};
type Payment={id:string;group_id:string;entry_date:string;category:string;amount:string;description:string;voided_at:string|null;created_by:string};
export async function supplierPaymentOverview(){
 const [groups,payments,summary]=await Promise.all([
 query<PurchasePaymentSummary>("SELECT group_id::text,received_date::text,supplier_id::text,supplier_name,payment_tracking,total::text,paid::text,due::text,active_lines FROM v_go_purchase_payment_summary ORDER BY received_date DESC,group_id DESC LIMIT 200"),
 query<Payment>("SELECT id::text,reference_id group_id,entry_date::text,category,amount::text,description,voided_at::text,created_by FROM cash_ledger_entries WHERE reference_type='supplier_purchase' ORDER BY entry_date DESC,created_at DESC LIMIT 1000"),
 query<{due:string;unverified:number;paid:string}>("SELECT COALESCE(SUM(due),0)::text due,COUNT(*) FILTER(WHERE NOT payment_tracking AND active_lines>0)::int unverified,COALESCE(SUM(paid),0)::text paid FROM v_go_purchase_payment_summary")
 ]);
 return {groups,payments,summary:summary[0]};
}
export async function lockPurchaseCash(c:PoolClient){await c.query("LOCK TABLE cash_ledger_entries IN SHARE ROW EXCLUSIVE MODE");}
async function summaryFor(c:PoolClient,id:string){
 await c.query("SELECT id FROM kelapa_go_purchase_groups WHERE id=$1 FOR UPDATE",[id]);
 const row=(await c.query<PurchasePaymentSummary>("SELECT group_id::text,received_date::text,supplier_id::text,supplier_name,payment_tracking,total::text,paid::text,due::text,active_lines FROM v_go_purchase_payment_summary WHERE group_id=$1",[id])).rows[0];
 if(!row||!row.payment_tracking||row.active_lines===0)throw new BusinessError("Pembelian tidak aktif atau pembayaran lama belum terverifikasi. Jangan catat ulang pengeluaran lama.");
 return row;
}
function paymentKey(key:string,wallet:string){const h=createHash("sha256").update("kelapa-go:supplier:"+key+":"+wallet).digest("hex");return h.slice(0,8)+"-"+h.slice(8,12)+"-4"+h.slice(13,16)+"-8"+h.slice(17,20)+"-"+h.slice(20,32);}
export async function appendSupplierPayment(c:PoolClient,input:{groupId:string;key:string;date:string;small:number;large:number;note:string},actor:string){
 const {groupId,key,date,small,large}=input;
 if(!uuid(groupId)||!uuid(key)||!day(date)||date>today()||!validPaymentAmount(small)||!validPaymentAmount(large)||toCents(small)+toCents(large)<=0||input.note.length>400)throw new BusinessError("Pembayaran supplier tidak valid.");
 const keys=[paymentKey(key,"SMALL"),paymentKey(key,"LARGE")];
 const existing=await c.query<{reference_id:string}>("SELECT reference_id FROM cash_ledger_entries WHERE request_key=ANY($1::uuid[])",[keys]);
 if(existing.rowCount){if(existing.rows.every(x=>x.reference_id===groupId))return;throw new BusinessError("Permintaan pembayaran sudah dipakai.");}
 const group=await summaryFor(c,groupId);
 if(date<group.received_date)throw new BusinessError("Tanggal pembayaran tidak boleh sebelum pembelian.");
 if(toCents(small)+toCents(large)>toCents(Number(group.due)))throw new BusinessError("Pembayaran melebihi sisa utang supplier.");
 for(const [i,wallet,amount] of [[0,"SMALL",small],[1,"LARGE",large]] as const){
  if(!amount)continue;
  const b=(await c.query<{balance:string}>(`SELECT (o.amount+COALESCE((SELECT SUM(CASE WHEN direction='IN' THEN amount ELSE -amount END) FROM cash_ledger_entries WHERE voided_at IS NULL AND (CASE WHEN category LIKE 'KAS BESAR:%' OR category='PENJUALAN TRANSFER' THEN 'LARGE' ELSE 'SMALL' END)=o.wallet),0))::text balance FROM operational_cash_openings o WHERE wallet=$1`,[wallet])).rows[0];
  if(!b)throw new BusinessError("Owner harus menetapkan saldo awal "+(wallet==="SMALL"?"Kas Kecil":"Kas Besar")+" sebelum pembayaran.");
  if(toCents(Number(b.balance))<toCents(amount))throw new BusinessError("Saldo "+(wallet==="SMALL"?"Kas Kecil":"Kas Besar")+" tidak mencukupi.");
  await c.query("INSERT INTO cash_ledger_entries(request_key,entry_date,direction,category,description,amount,reference_type,reference_id,created_by) VALUES($1,$2,'OUT',$3,$4,$5,'supplier_purchase',$6,$7)",[keys[i],date,wallet==="LARGE"?"KAS BESAR: PEMBELIAN KELAPA":"PEMBELIAN KELAPA","Pembayaran kelapa · "+group.supplier_name+(input.note?" · "+input.note.trim():""),amount,groupId,actor]);
 }
 await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'supplier.payment','purchase',$2)",[actor,groupId]);
}
export async function recordSupplierPayment(input:{groupId:string;key:string;date:string;small:number;large:number;note:string},actor:string){
 return transaction(async c=>{await lockPurchaseCash(c);await appendSupplierPayment(c,input,actor);});
}
export function validateInitialPayment(status:string,total:number,small:number,large:number){
 if(!paymentSplitValid(status,total,small,large))throw new BusinessError("Status pembayaran dan total Kas Kecil/Kas Besar harus sesuai nilai pembelian.");
}
export async function voidSupplierPayment(id:string,reason:string,actor:string){
 if(!uuid(id)||reason.trim().length<5||reason.length>400)throw new BusinessError("Alasan pembatalan wajib.");
 return transaction(async c=>{
  await lockPurchaseCash(c);
  const old=(await c.query<{id:string;reference_id:string;category:string;amount:string;entry_date:string;description:string;voided_at:string|null}>("SELECT id::text,reference_id,category,amount::text,entry_date::text,description,voided_at::text FROM cash_ledger_entries WHERE id=$1 AND reference_type='supplier_purchase' FOR UPDATE",[id])).rows[0];
  if(!old||old.voided_at)throw new BusinessError("Pembayaran tidak ditemukan atau sudah dibatalkan.");
  await c.query("UPDATE cash_ledger_entries SET voided_at=now() WHERE id=$1",[id]);
  await c.query("INSERT INTO transaction_correction_events(entity_type,entity_id,action,reason,previous_state,next_state,actor_id) VALUES('supplier_payment',$1,'void',$2,$3::jsonb,$4::jsonb,$5)",[id,reason.trim(),JSON.stringify(old),JSON.stringify({voided:true,groupId:old.reference_id}),actor]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,'supplier.payment.void','purchase',$2)",[actor,old.reference_id]);
 });
}
export async function verifyPurchaseCorrection(c:PoolClient,groupId:string,oldSupplierId:string){
 const row=(await c.query<PurchasePaymentSummary>("SELECT group_id::text,received_date::text,supplier_id::text,supplier_name,payment_tracking,total::text,paid::text,due::text,active_lines FROM v_go_purchase_payment_summary WHERE group_id=$1",[groupId])).rows[0];
 if(!row||!row.payment_tracking)return;
 if(toCents(Number(row.paid))>toCents(Number(row.total)))throw new BusinessError("Nilai pembelian tidak boleh kurang dari pembayaran yang telah dicatat. Koreksi pembayaran yang salah terlebih dahulu; jangan batalkan pembayaran yang benar-benar terjadi.");
 if(row.supplier_id!==oldSupplierId&&Number(row.paid)>0)throw new BusinessError("Supplier tidak dapat diganti setelah pembayaran. Rekonsiliasi terlebih dahulu.");
}
