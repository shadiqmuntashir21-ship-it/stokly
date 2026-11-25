import {query,transaction} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
export async function transactionAudit(entityType:string){
 return query<{id:string;entity_id:string;action:string;reason:string;actor_id:string;created_at:string}>("SELECT id::text,entity_id,action,reason,actor_id,created_at::text FROM transaction_correction_events WHERE entity_type=$1 ORDER BY created_at DESC LIMIT 100",[entityType]);
}
type Purchase={id:string;batch_id:string;supplier_id:string;grade_id:string;quantity:number;price_per_butir:string;received_date:string;accepted_qty:number;rejected_qty:number;consumed_qty:number;voided_at:string|null;note:string};
export async function correctPurchase(input:{id:string;mode:string;reason:string;supplierId:string;gradeId:string;date:string;quantity:number;price:number;note:string},actor:string){
 const {id,mode,reason}=input;
 if(!uuid(id)||!["edit","void"].includes(mode)||reason.trim().length<5||reason.length>400)throw new BusinessError("Koreksi harus memiliki transaksi dan alasan yang valid.");
 if(mode==="edit"&&(!uuid(input.supplierId)||!uuid(input.gradeId)||!date(input.date)||!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>9999999||!Number.isFinite(input.price)||input.price<=0||input.price>1e9||input.note.length>400))throw new BusinessError("Data pembelian tidak valid.");
 return transaction(async c=>{
  const result=await c.query<Purchase>(`SELECT r.id::text,b.id::text batch_id,r.supplier_id::text,r.grade_id::text,r.quantity,r.price_per_butir::text,(r.received_at AT TIME ZONE 'Asia/Makassar')::date::text received_date,b.accepted_qty,b.rejected_qty,b.consumed_qty,b.voided_at::text,r.note FROM coconut_batches b JOIN coconut_receipts r ON r.id=b.receipt_id WHERE r.id=$1 FOR UPDATE OF b,r`,[id]);
  const old=result.rows[0];
  if(!old||old.voided_at)throw new BusinessError("Pembelian tidak ditemukan atau sudah dibatalkan.");
  if(old.consumed_qty>0)throw new BusinessError("Bahan baku sudah digunakan produksi. Koreksi langsung ditolak agar HPP dan stok tidak rusak.");
  const linked=await c.query("SELECT production_id FROM coconut_production_day_consumptions WHERE batch_id=$1 UNION ALL SELECT id FROM coconut_production WHERE batch_id=$1",[old.batch_id]);
  if(linked.rowCount)throw new BusinessError("Pembelian memiliki relasi produksi; rekonsiliasi Owner diperlukan.");
  const before=JSON.stringify(old);
  if(mode==="void"){
   await c.query("UPDATE coconut_batches SET voided_at=now() WHERE id=$1",[old.batch_id]);
   await c.query("UPDATE supplier_prices SET voided_at=now() WHERE source_receipt_id=$1 AND voided_at IS NULL",[id]);
  }else{
   if(input.quantity<old.accepted_qty+old.rejected_qty)throw new BusinessError("Jumlah pembelian tidak boleh kurang dari total QC.");
   if(input.gradeId!==old.grade_id&&old.accepted_qty+old.rejected_qty>0)throw new BusinessError("Grade yang sudah melalui QC tidak dapat diubah langsung.");
   const supplierChanged=input.supplierId!==old.supplier_id,dateChanged=input.date!==old.received_date;
   if(supplierChanged&&!(await c.query("SELECT id FROM suppliers WHERE id=$1 AND active=true",[input.supplierId])).rowCount)throw new BusinessError("Supplier tidak aktif.");
   if(input.gradeId!==old.grade_id&&!(await c.query("SELECT id FROM coconut_grades WHERE id=$1 AND active=true",[input.gradeId])).rowCount)throw new BusinessError("Grade tidak aktif.");
   const group=await c.query<{group_id:string}>("SELECT group_id::text FROM kelapa_go_purchase_rows WHERE receipt_id=$1",[id]);
   if(group.rows[0]&&(supplierChanged||dateChanged)){
    const groupId=group.rows[0].group_id;
    await c.query("SELECT id FROM kelapa_go_purchase_groups WHERE id=$1 FOR UPDATE",[groupId]);
    const n=await c.query<{n:number}>("SELECT count(*)::int n FROM kelapa_go_purchase_rows WHERE group_id=$1",[groupId]);
    if(n.rows[0].n!==1)throw new BusinessError("Supplier/tanggal pembelian multi-grade perlu koreksi kelompok oleh Owner.");
    await c.query("UPDATE kelapa_go_purchase_groups SET supplier_id=$2,received_date=$3 WHERE id=$1",[groupId,input.supplierId,input.date]);
   }
   await c.query("UPDATE coconut_receipts SET supplier_id=$2,grade_id=$3,quantity=$4,price_per_butir=$5,received_at=CASE WHEN (received_at AT TIME ZONE 'Asia/Makassar')::date=$6::date THEN received_at ELSE ($6::date+TIME '12:00') AT TIME ZONE 'Asia/Makassar' END,note=$7 WHERE id=$1",[id,input.supplierId,input.gradeId,input.quantity,input.price,input.date,input.note]);
   await c.query("UPDATE coconut_batches SET received_qty=$2 WHERE id=$1",[old.batch_id,input.quantity]);
   await c.query("UPDATE supplier_prices SET supplier_id=$2,grade_id=$3,unit_price=$4,note=$5 WHERE source_receipt_id=$1 AND voided_at IS NULL",[id,input.supplierId,input.gradeId,input.price,"Harga pembelian "+input.date]);
  }
  await c.query("INSERT INTO transaction_correction_events(entity_type,entity_id,action,reason,previous_state,next_state,actor_id) VALUES('purchase',$1,$2,$3,$4::jsonb,$5::jsonb,$6)",[id,mode,reason.trim(),before,JSON.stringify(mode==="void"?{voided:true}:input),actor]);
  await c.query("INSERT INTO activity_logs(actor_id,action,entity,entity_id) VALUES($1,$2,'coconut_receipt',$3)",[actor,"purchase."+mode,id]);
 });
}
