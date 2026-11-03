import Link from "next/link";
import {requireActor} from "@/lib/access";
import {listInvoices} from "@/lib/order-operations";
import {query} from "@/lib/db";
import {rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Line={name:string;unit:string;quantity:number;unit_price:string;total:string};
export default async function PrintReceipt({params}:{params:Promise<{id:string}>}){
 await requireActor(["owner","admin"]);
 const {id}=await params;
 if(!uuid.test(id))return <p>Nomor order tidak valid.</p>;
 const [all,lines]=await Promise.all([
  listInvoices(),
  query<Line>("SELECT p.name,p.unit,SUM(di.quantity)::int AS quantity,di.unit_price::text,(SUM(di.quantity)*di.unit_price)::text AS total FROM delivery_notes d JOIN delivery_note_items di ON di.delivery_id=d.id JOIN customer_order_items oi ON oi.id=di.order_item_id JOIN products p ON p.id=oi.product_id WHERE d.order_id=$1 GROUP BY p.name,p.unit,di.unit_price ORDER BY p.name",[id])
 ]);
 const order=all.find(x=>x.id===id);
 if(!order)return <p>Dokumen tidak ditemukan atau di luar daftar terbaru.</p>;
 const gross=Number(order.gross),credit=Number(order.credit),paid=Number(order.paid),net=Math.max(0,gross-credit);
 return <main className="print-receipt" style={{maxWidth:780,margin:"20px auto",padding:32,background:"#fff",color:"#172319",fontFamily:"Arial, sans-serif"}}>
  <div className="print-actions"><Link href="/invoices">Kembali ke Kwitansi</Link><p>Gunakan Ctrl+P / Cmd+P untuk mencetak atau menyimpan sebagai PDF.</p></div>
  <header style={{display:"flex",justifyContent:"space-between",gap:24,borderBottom:"2px solid #285b46",marginBottom:24}}>
    <h1>STOKLY.</h1><div style={{textAlign:"right"}}><strong>KWITANSI / NOTA OUTLET</strong><p>No. {order.document_number||"BELUM DIREKONSILIASI"}</p></div>
  </header>
  <section style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:25}}>
    <p><b>Outlet:</b> {order.outlet}</p><p><b>G.O:</b> {order.group_name}</p>
    <p><b>Tanggal:</b> {order.ordered_on}</p><p><b>Barang terkirim:</b> {order.pcs} unit</p>
  </section>
  <table style={{width:"100%",borderCollapse:"collapse"}}>
    <thead><tr><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Barang</th><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Jumlah</th><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Harga</th><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Total</th></tr></thead>
    <tbody>{lines.map((l,i)=><tr key={i}><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{l.name}</td><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{l.quantity} {l.unit}</td><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{rupiah(l.unit_price)}</td><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{rupiah(l.total)}</td></tr>)}</tbody>
  </table>
  <section style={{margin:"25px 0 0 auto",maxWidth:370}}>
    <p>Amount: <strong>{rupiah(gross)}</strong></p>
    <p>Retur: <strong>{rupiah(credit)}</strong></p>
    <p>Final Amount: <strong>{rupiah(net)}</strong></p>
    <p>Terbayar: <strong>{rupiah(paid)}</strong></p>
    <h3>Sisa Piutang: {rupiah(Math.max(0,net-paid))}</h3>
  </section>
  <p style={{marginTop:65,fontSize:12}}>Dihasilkan oleh STOKLY dari barang terkirim dan transaksi retur/pembayaran tercatat.</p>
  <style>{"@media print {.print-actions{display:none!important}.print-receipt{margin:0!important;padding:0!important;max-width:none!important}body{background:white!important}}"}</style>
 </main>;
}
