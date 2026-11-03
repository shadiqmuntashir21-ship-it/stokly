import {requireActor} from "@/lib/access";
import {listInvoices} from "@/lib/order-operations";
export const dynamic="force-dynamic";
const safe=(s:string)=>{
 const cleaned=s.replace(/\r|\n/g," ").trim();
 return /^[=+\-@\t]/.test(cleaned)?"'"+cleaned:cleaned;
};
const esc=(value:unknown)=>'"'+safe(String(value??"")).replaceAll('"','""')+'"';
export async function GET(){
 await requireActor(["owner","admin"]);
 const data=await listInvoices();
 const header=["NO KWITANSI","TGL","OUTLET","G.O","PCS","AMOUNT","RETURN","PAYMENT","TGL BAYAR","BLN BAYAR","BULAN","PAYMENT METODE","FINAL AMOUNT","TERBAYAR","SISA PIUTANG","FISIK KWITANSI"];
 const lines=[header.map(esc).join(",")];
 for(const r of data){
  const gross=Number(r.gross),credit=Number(r.credit),paid=Number(r.paid);
  const net=Math.max(0,gross-credit),due=Math.max(0,net-paid);
  const payment=r.status==="cancelled"?"BATAL":r.deliveries===0?"BELUM DIKIRIM":due===0?"PAID":paid>0?"PARTIAL":"UNPAID";
  const arr=[r.document_number||"",r.ordered_on,r.outlet,r.group_name,r.pcs,gross,credit,payment,r.paid_at||"",r.paid_at?Number(r.paid_at.slice(5,7)):"",Number(r.ordered_on.slice(5,7)),r.payment_method||"",net,paid,due,r.physical_receipt_type];
  lines.push(arr.map(esc).join(","));
 }
 return new Response("\uFEFF"+lines.join("\r\n"),{
  headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="stokly-rekap-kwitansi.csv"',"Cache-Control":"no-store"}
 });
}
