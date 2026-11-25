import {requireOwner} from "@/lib/access";
import {buildSalesReport,salesSheets} from "@/lib/sales-report";
import {salesPeriod} from "@/lib/dashboard-analytics";
import {makeWorkbook,makeReportPdf} from "@/lib/report-files";
export const dynamic="force-dynamic";
const rp=(n:number)=>"Rp"+n.toLocaleString("id-ID",{maximumFractionDigits:2});
export async function GET(req:Request){
 await requireOwner();
 const p=new URL(req.url).searchParams,source=p.get("source"),format=p.get("format")||"xlsx";
 if((source!=="legacy"&&source!=="live")||(format!=="xlsx"&&format!=="pdf"))return new Response("Sumber/format tidak valid.",{status:400});
 let period;try{period=salesPeriod(1,{from:p.get("from")||"",to:p.get("to")||""});}catch{return new Response("Rentang tanggal tidak valid (maksimal 730 hari).",{status:400});}
 const r=await buildSalesReport(source,period.from,period.to);
 const chart=r.daily.length<=31?r.daily.map(x=>({label:x.name.slice(8)+"/"+x.name.slice(5,7),value:x.net})):r.monthly.map(x=>({label:x.name,value:x.net}));
 const bytes=format==="xlsx"?makeWorkbook(salesSheets(r)):makeReportPdf("KELAPA GO - Traffic Penjualan",[
 "Sumber: "+(source==="legacy"?"Arsip historis (sebagian perlu audit)":"Operasional baru"),"Periode "+r.from+" s.d. "+r.to+" (WITA)",
 "Penjualan bersih: "+rp(r.total.net)+" | Kwitansi: "+r.total.receipts+" | Jumlah: "+r.total.quantity,
 "Bruto: "+rp(r.total.gross)+" | Retur: "+rp(r.total.returned),
 "Piutang terverifikasi nota periode saat unduh: "+rp(r.currentDue)+" | Perlu rekonsiliasi: "+r.unknownDue,
 "Retur dikaitkan pada nota asal; penjualan berbeda dari penerimaan pembayaran.",
 "", "TOP 5 OUTLET - PENJUALAN BERSIH",...r.rankings.slice(0,5).map((x,i)=>(i+1)+". "+x.name+" | "+rp(x.net)+" | "+x.receipts+" kwitansi"),
 "", "TRAFFIC HARIAN",...r.daily.map(x=>x.name+" | "+x.receipts+" nota | Bruto "+rp(x.gross)+" | Retur "+rp(x.returned)+" | Bersih "+rp(x.net)),
 "", "RANKING SELURUH OUTLET",...r.rankings.map((x,i)=>(i+1)+". "+x.name+" | "+rp(x.net)+" | "+x.receipts+" kwitansi"),
 "", "Rincian nota, produk dan pembayaran tersedia pada Excel."
 ],chart);
 return new Response(new Uint8Array(bytes),{headers:{"Content-Type":format==="xlsx"?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"application/pdf","Content-Disposition":'attachment; filename="KELAPA-GO-Traffic-'+source+'-'+r.from+'-'+r.to+'.'+format+'"',"Cache-Control":"no-store"}});
}
