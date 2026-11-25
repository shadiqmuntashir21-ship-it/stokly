import {requireActor} from "@/lib/access";
import {cashReport,reportPeriod,todayWita} from "@/lib/cash-report";
import {makeWorkbook,makeReportPdf} from "@/lib/report-files";
export const dynamic="force-dynamic";
const w=(s:string)=>s==="SMALL"?"Kas Kecil":"Kas Besar";
const money=(n:string|null)=>n===null?"Belum ditetapkan":"Rp"+Number(n).toLocaleString("id-ID");
const val=(n:string|null)=>n===null?null:Number(n);
export async function GET(req:Request){
 await requireActor(["owner","admin"]);
 const p=new URL(req.url).searchParams,from=p.get("from")||todayWita(),to=p.get("to")||from,format=p.get("format")||"xlsx";
 try{reportPeriod(from,to);}catch{return new Response("Tanggal tidak valid atau periode terlalu panjang.",{status:400});}
 if(!["xlsx","pdf"].includes(format))return new Response("Format tidak valid.",{status:400});
 const r=await cashReport(from,to);
 const totals=r.totals.map(t=>[w(t.wallet),val(t.opening),Number(t.incoming),Number(t.outgoing),Number(t.operational),Number(t.purchases),Number(t.assets),val(t.closing)]);
 const budget=r.budgets.map(b=>[b.date,val(b.budget),Number(b.spent),b.budget===null?null:Number(b.budget)-Number(b.spent)]);
 const bytes=format==="xlsx"?makeWorkbook([
 {name:"Ringkasan",rows:[["Periode",from,to],["Sumber kas","Saldo awal","Masuk","Keluar","Operasional","Pembelian Kelapa","Aset","Saldo akhir"],...totals]},
 {name:"Budget Kas Kecil",rows:[["Tanggal","Budget","Terpakai","Sisa"],...budget]},
 {name:"Transaksi",rows:[["Tanggal","Sumber kas","Jenis","Kategori","Keterangan","Nominal"],...r.rows.map(x=>[x.date,w(x.wallet),x.direction==="IN"?"Masuk":"Keluar",x.category,x.description,Number(x.amount)])]}
 ]):makeReportPdf("KELAPA GO - Laporan Kas",[
 "Periode "+from+" s.d. "+to+" (WITA)","Arsip historis tidak termasuk saldo operasional.",
 ...r.totals.flatMap(t=>[w(t.wallet),"Saldo awal: "+money(t.opening)+" | Masuk: "+money(t.incoming)+" | Keluar: "+money(t.outgoing),"Operasional: "+money(t.operational)+" | Pembelian kelapa: "+money(t.purchases)+" | Aset: "+money(t.assets),"Saldo akhir: "+money(t.closing),""]),
 "BUDGET OPERASIONAL KAS KECIL",...r.budgets.map(b=>b.date+" | Budget "+money(b.budget)+" | Terpakai "+money(b.spent)+" | Sisa "+money(b.budget===null?null:String(Number(b.budget)-Number(b.spent)))),
 "","RINCIAN TRANSAKSI",...r.rows.map(x=>x.date+" | "+w(x.wallet)+" | "+(x.direction==="IN"?"Masuk":"Keluar")+" | "+x.category+" | "+money(x.amount)+" | "+x.description)
 ]);
 return new Response(new Uint8Array(bytes),{headers:{"Content-Type":format==="xlsx"?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"application/pdf","Content-Disposition":'attachment; filename="KELAPA-GO-Kas-'+from+'-'+to+'.'+format+'"',"Cache-Control":"no-store"}});
}
