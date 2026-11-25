import {transaction} from "@/lib/db";
import {salesBase,salesPeriod} from "@/lib/dashboard-analytics";
import type {Sheet,Cell} from "@/lib/report-files";
type Sale={day:string;number:string|null;outlet:string;quantity:number|null;gross:string;returned:string;net:string;due:string|null;payment_status:string};
type Payment={date:string|null;number:string;outlet:string;method:string|null;amount:string;origin:string};
type Detail={number:string;day:string;outlet:string;product:string;quantity:number;unit_price:string;subtotal:string};
type Aggregate={name:string;gross:number;returned:number;net:number;receipts:number;quantity:number};
const empty=(name:string):Aggregate=>({name,gross:0,returned:0,net:0,receipts:0,quantity:0});
const add=(a:Aggregate,s:Sale)=>{a.gross+=Number(s.gross);a.returned+=Number(s.returned);a.net+=Number(s.net);a.receipts++;a.quantity+=Number(s.quantity||0);};
export async function buildSalesReport(source:"legacy"|"live",from:string,to:string){
 salesPeriod(1,{from,to});
 return transaction(async c=>{
  await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const base=salesBase(source);
  const due=source==="legacy"
   ?"SELECT b.day::text,b.number,b.outlet,b.quantity,b.gross::text,b.returned::text,b.net::text,CASE WHEN v.document_number IS NULL AND r.status='PAID' THEN '0' ELSE v.confirmed_due::text END due,CASE WHEN v.needs_reconciliation OR (v.document_number IS NULL AND r.status<>'PAID') THEN 'Perlu rekonsiliasi' WHEN v.confirmed_due>0 THEN 'Belum lunas' WHEN v.confirmed_due=0 OR r.status='PAID' THEN 'Lunas' ELSE 'Belum terverifikasi' END payment_status FROM ("+base+") b JOIN legacy_receipts r ON r.document_number=b.sale_id LEFT JOIN v_go_unpaid_current v ON v.document_number=b.number"
   :"SELECT b.day::text,b.number,b.outlet,b.quantity,b.gross::text,b.returned::text,b.net::text,GREATEST(0,b.net-COALESCE(p.paid,0))::text due,CASE WHEN b.net<=COALESCE(p.paid,0) THEN 'Lunas' WHEN COALESCE(p.paid,0)>0 THEN 'Sebagian' ELSE 'Belum dibayar' END payment_status FROM ("+base+") b JOIN delivery_invoices i ON i.id::text=b.sale_id AND i.status='issued' LEFT JOIN LATERAL (SELECT SUM(amount) paid FROM delivery_payments WHERE invoice_id=i.id) p ON true";
  const sales=(await c.query<Sale>(due+" ORDER BY b.day,b.number LIMIT 50001",[from,to])).rows;
  if(sales.length>50000)throw Error("Pilih periode lebih pendek.");
  const paymentSql=source==="legacy"
   ?"SELECT r.paid_on::text date,r.document_number number,r.outlet_name outlet,r.payment_method method,r.final_amount::text amount,'Arsip pembayaran asli (berdasarkan catatan)' origin FROM legacy_receipts r WHERE r.paid_on BETWEEN $1 AND $2 AND upper(COALESCE(r.original ->> 7,''))='PAID' AND r.status<>'VOID' UNION ALL SELECT p.paid_on::text,r.document_number,r.outlet_name,p.payment_method,p.amount::text,'Pelunasan tercatat di sistem' FROM legacy_receipt_payments p JOIN legacy_receipts r ON r.document_number=p.document_number WHERE p.paid_on BETWEEN $1 AND $2 AND r.status<>'VOID' ORDER BY date,number"
   :"SELECT (p.paid_at AT TIME ZONE 'Asia/Makassar')::date::text date,d.document_number number,o.name outlet,p.payment_method method,p.amount::text,'Pembayaran operasional' origin FROM delivery_payments p JOIN delivery_invoices i ON i.id=p.invoice_id AND i.status='issued' JOIN delivery_notes d ON d.id=i.delivery_id JOIN customer_orders co ON co.id=d.order_id JOIN outlets o ON o.id=co.outlet_id WHERE (p.paid_at AT TIME ZONE 'Asia/Makassar')::date BETWEEN $1 AND $2 ORDER BY date,number";
  const payments=(await c.query<Payment>(paymentSql+" LIMIT 50001",[from,to])).rows;
  if(payments.length>50000)throw Error("Pilih periode pembayaran lebih pendek.");
  const detail=source==="live"?(await c.query<Detail>("SELECT d.document_number number,d.delivered_on::text day,o.name outlet,p.name product,di.quantity,di.unit_price::text,(di.quantity*di.unit_price)::text subtotal FROM delivery_notes d JOIN delivery_invoices i ON i.delivery_id=d.id AND i.status='issued' JOIN customer_orders co ON co.id=d.order_id JOIN outlets o ON o.id=co.outlet_id JOIN delivery_note_items di ON di.delivery_id=d.id JOIN customer_order_items oi ON oi.id=di.order_item_id JOIN products p ON p.id=oi.product_id WHERE d.delivered_on BETWEEN $1 AND $2 ORDER BY d.delivered_on,d.document_number,p.name LIMIT 50001",[from,to])).rows:[];
  if(detail.length>50000)throw Error("Pilih periode item lebih pendek.");
  const days=new Map<string,Aggregate>(),months=new Map<string,Aggregate>(),outlets=new Map<string,Aggregate>(),total=empty("Total");
  for(let d=new Date(from+"T00:00:00Z");d.toISOString().slice(0,10)<=to;d.setUTCDate(d.getUTCDate()+1)){const key=d.toISOString().slice(0,10);days.set(key,empty(key));if(!months.has(key.slice(0,7)))months.set(key.slice(0,7),empty(key.slice(0,7)));}
  for(const s of sales){add(total,s);add(days.get(s.day)!,s);add(months.get(s.day.slice(0,7))!,s);if(!outlets.has(s.outlet))outlets.set(s.outlet,empty(s.outlet));add(outlets.get(s.outlet)!,s);}
  const ranked=(await c.query<{name:string}>("SELECT outlet AS name FROM ("+base+") sales GROUP BY outlet ORDER BY SUM(net) DESC,outlet COLLATE \"C\"",[from,to])).rows;
  const rankings=ranked.map(x=>outlets.get(x.name)!);
  const daily=[...days.values()],monthly=[...months.values()];
  const currentDue=sales.reduce((n,s)=>n+Number(s.due||0),0),unknownDue=sales.filter(s=>s.due===null).length;
  return {source,from,to,total,daily,monthly,rankings,sales,payments,detail,currentDue,unknownDue};
 });
}
export type SalesReport=Awaited<ReturnType<typeof buildSalesReport>>;
export function salesSheets(r:SalesReport):Sheet[]{
 const a=(x:Aggregate):Cell[]=>[x.name,x.receipts,x.quantity,x.gross,x.returned,x.net];
 const headers=["Tanggal / outlet","Kwitansi","Jumlah","Bruto","Retur","Bersih"];
 return [
 {name:"Ringkasan",rows:[["KELAPA GO - Traffic Penjualan"],["Sumber",r.source==="legacy"?"Arsip historis":"Operasional baru"],["Periode",r.from,r.to],["Catatan","Penjualan sesuai tanggal nota/pengiriman. Retur dikaitkan ke nota asal; piutang menunjukkan kondisi saat unduh. Pembayaran memakai tanggal bayar dan bukan penjualan."],["Total kwitansi",r.total.receipts],["Jumlah produk",r.total.quantity],["Bruto",r.total.gross],["Retur",r.total.returned],["Bersih",r.total.net],["Piutang terverifikasi nota periode",r.currentDue],["Nota perlu rekonsiliasi",r.unknownDue]]},
 {name:"Traffic Harian",rows:[headers,...r.daily.map(a)]},
 {name:"Traffic Bulanan",rows:[headers,...r.monthly.map(a)]},
 {name:"Top 5 Outlet",rows:[["Peringkat",...headers],...r.rankings.slice(0,5).map((x,i)=>[i+1,...a(x)])]},
 {name:"Seluruh Outlet",rows:[["Peringkat",...headers],...r.rankings.map((x,i)=>[i+1,...a(x)])]},
 {name:"Detail Penjualan",rows:[["Tanggal","No. Kwitansi","Outlet","Jumlah","Bruto","Retur","Bersih","Status Bayar","Sisa piutang terverifikasi"],...r.sales.map(s=>[s.day,s.number,s.outlet,s.quantity,Number(s.gross),Number(s.returned),Number(s.net),s.payment_status,s.due===null?null:Number(s.due)])]},
 {name:"Detail Produk",rows:[["No. Kwitansi","Tanggal","Outlet","Produk","Jumlah","Harga","Subtotal bruto"],...(r.source==="legacy"?[["Arsip historis tidak memiliki rincian produk terverifikasi."]]:r.detail.map(d=>[d.number,d.day,d.outlet,d.product,d.quantity,Number(d.unit_price),Number(d.subtotal)]))]},
 {name:"Pembayaran",rows:[["Tanggal Bayar","Nomor","Outlet","Metode","Nominal","Sumber"],...r.payments.map(p=>[p.date,p.number,p.outlet,p.method,Number(p.amount),p.origin]),["Catatan","Arsip tanpa tanggal/metode lengkap tidak dapat dianggap penerimaan kas periode; arsip dan ledger baru tidak dijumlahkan otomatis."]]}
 ];
}
