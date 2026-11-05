import Link from "next/link";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
type Head={id:string;document_number:string;delivered_on:string;outlet:string;address:string;gross:string;retur:string;paid:string};
type Line={name:string;unit:string;quantity:number;unit_price:string};
export default async function PrintNote({params}:{params:Promise<{id:string}>}){
 await requireActor(["owner","admin"]);
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return <p>Nomor nota tidak valid.</p>;
 const [heads,lines]=await Promise.all([
  query<Head>("SELECT d.id::text,d.document_number,d.delivered_on::text,o.name outlet,o.address,i.gross::text,COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0)::text retur,COALESCE((SELECT SUM(p.amount) FROM delivery_payments p WHERE p.invoice_id=i.id),0)::text paid FROM delivery_notes d JOIN customer_orders c ON c.id=d.order_id JOIN outlets o ON o.id=c.outlet_id JOIN delivery_invoices i ON i.delivery_id=d.id WHERE d.id=$1",[id]),
  query<Line>("SELECT p.name,p.unit,di.quantity,di.unit_price::text FROM delivery_note_items di JOIN customer_order_items oi ON oi.id=di.order_item_id JOIN products p ON p.id=oi.product_id WHERE di.delivery_id=$1 ORDER BY p.name",[id])
 ]);
 const h=heads[0];if(!h)return <p>Nota tidak ditemukan.</p>;
 const net=Number(h.gross)-Number(h.retur);
 return <main className="print-receipt" style={{maxWidth:760,margin:"20px auto",padding:30,background:"#fff",color:"#172319",fontFamily:"Arial,sans-serif"}}>
 <div className="print-actions"><Link href="/invoices/notes">Kembali</Link><p>Cetak dengan Ctrl+P / Cmd+P</p></div>
 <header style={{display:"flex",justifyContent:"space-between",borderBottom:"2px solid #285b46",paddingBottom:15}}>
  <h1>STOKLY.</h1><div style={{textAlign:"right"}}><strong>KWITANSI PENGIRIMAN</strong><p>No. {h.document_number}</p></div>
 </header>
 <p><strong>Outlet:</strong> {h.outlet}</p><p><strong>Alamat:</strong> {h.address}</p><p><strong>Tanggal kirim:</strong> {h.delivered_on}</p>
 <table style={{width:"100%",borderCollapse:"collapse",marginTop:20}}><thead><tr><th style={{textAlign:"left"}}>Produk</th><th>Jumlah</th><th>Harga</th><th>Total</th></tr></thead><tbody>
 {lines.map((x,i)=><tr key={i}><td style={{padding:8,borderBottom:"1px solid #ddd"}}>{x.name}</td><td>{x.quantity} {x.unit}</td><td>{rupiah(x.unit_price)}</td><td>{rupiah(x.quantity*Number(x.unit_price))}</td></tr>)}
 </tbody></table>
 <div style={{textAlign:"right",marginTop:24}}><p>Bruto: {rupiah(h.gross)}</p><p>Retur: {rupiah(h.retur)}</p><p>Tagihan: <strong>{rupiah(net)}</strong></p><p>Terbayar: {rupiah(h.paid)}</p><p><strong>Sisa: {rupiah(Math.max(0,net-Number(h.paid)))}</strong></p></div>
 <p style={{marginTop:80,fontSize:12}}>Nota dibuat otomatis dari pengiriman di STOKLY. Simpan sebagai PDF atau cetak untuk outlet.</p>
 <style>{"@media print {.print-actions{display:none!important}.print-receipt{margin:0!important;padding:0!important;max-width:none!important}body{background:white!important}}"}</style>
 </main>;
}
