import Link from "next/link";
import {requireActor} from "@/lib/access";
import {listInvoices} from "@/lib/order-operations";
import {query} from "@/lib/db";
import {rupiah} from "@/components/ui";

export const dynamic="force-dynamic";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Line={name:string;unit:string;quantity:number;unit_price:string;total:string};

export default async function PrintReceipt({params}:{params:Promise<{id:string}>}){
 await requireActor(["owner","admin"]);
 const {id}=await params;
 if(!uuid.test(id))return <p>Nomor order tidak valid. <Link href="/orders">Kembali</Link></p>;
 const orderRows=await listInvoices({orderId:id,limit:1});
 const order=orderRows[0];
 if(!order)return <p>Order tidak ditemukan. <Link href="/orders">Kembali</Link></p>;
 if(!order.document_number)return <p>Nomor nota belum diberikan. Minta Owner memeriksa penomoran kuitansi lama. <Link href="/orders">Kembali</Link></p>;
 const shipped=order.deliveries>0;
 const lines=shipped
  ?await query<Line>("SELECT p.name,p.unit,SUM(di.quantity)::int AS quantity,di.unit_price::text,(SUM(di.quantity)*di.unit_price)::text AS total FROM delivery_notes d JOIN delivery_note_items di ON di.delivery_id=d.id JOIN customer_order_items oi ON oi.id=di.order_item_id JOIN products p ON p.id=oi.product_id WHERE d.order_id=$1 GROUP BY p.name,p.unit,di.unit_price ORDER BY p.name",[id])
  :await query<Line>("SELECT p.name,p.unit,i.quantity,i.unit_price::text,(i.quantity*i.unit_price)::text AS total FROM customer_order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=$1 ORDER BY p.name",[id]);
 const gross=Number(order.gross),credit=Number(order.credit),paid=Number(order.paid),net=Math.max(0,gross-credit);
 const initialTotal=Number(order.ordered_total);
 return <main className="print-receipt" style={{maxWidth:780,margin:"20px auto",padding:32,background:"#fff",color:"#172319",fontFamily:"Arial, sans-serif"}}>
  <div className="print-actions"><Link href={"/orders/"+id}>Kembali ke Order</Link><p>Tekan Ctrl+P / Cmd+P untuk cetak atau simpan PDF.</p></div>
  <header style={{display:"flex",justifyContent:"space-between",gap:24,borderBottom:"2px solid #285b46",marginBottom:24,paddingBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}><img src="/brand/kelapa-go-symbol.svg" alt="Logo KELAPA GO" width="44" height="44"/><h1 style={{fontSize:28}}>KELAPA GO</h1></div>
    <div style={{textAlign:"right"}}><strong>{shipped?"KWITANSI / NOTA OUTLET":"BUKTI PEMESANAN"}</strong><p>No. {order.document_number}</p></div>
  </header>
  {!shipped&&<p style={{padding:"12px 14px",border:"1px solid #dab76e",borderRadius:8,background:"#fffaf0",fontWeight:700,fontSize:12}}>BELUM DIKIRIM — Bukti pesanan ini bukan bukti barang diterima, bukan kuitansi pembayaran, dan belum menjadi penjualan terkirim.</p>}
  {order.status==="cancelled"&&<p style={{padding:12,border:"1px solid #ad3434",fontWeight:700}}>ORDER DIBATALKAN — Nota tidak berlaku.</p>}
  <section style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:25}}>
    <p><b>Outlet:</b> {order.outlet}</p><p><b>G.O:</b> {order.group_name}</p>
    <p><b>Tanggal order:</b> {order.ordered_on}</p>
    <p><b>{shipped?"Barang terkirim":"Jumlah dipesan"}:</b> {shipped?order.pcs:order.ordered_pcs} unit (rincian satuan di tabel)</p>
  </section>
  <table style={{width:"100%",borderCollapse:"collapse"}}>
    <thead><tr><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Barang</th><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Jumlah</th><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Harga / satuan</th><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #aaa"}}>Total</th></tr></thead>
    <tbody>{lines.map((l,i)=><tr key={i}><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{l.name}</td><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{l.quantity} {l.unit}</td><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{rupiah(l.unit_price)}</td><td style={{padding:10,borderBottom:"1px solid #ddd"}}>{rupiah(l.total)}</td></tr>)}</tbody>
  </table>
  <section style={{margin:"25px 0 0 auto",maxWidth:370}}>
    {shipped?<><p>Nilai barang terkirim: <strong>{rupiah(gross)}</strong></p><p>Retur: <strong>{rupiah(credit)}</strong></p><p>Total tagihan: <strong>{rupiah(net)}</strong></p><p>Terbayar: <strong>{rupiah(paid)}</strong></p><h3>Sisa pembayaran: {rupiah(Math.max(0,net-paid))}</h3></>
     :<><p>Estimasi nilai pesanan: <strong>{rupiah(initialTotal)}</strong></p><p style={{fontSize:12}}>Tagihan akan diterbitkan sesuai jumlah barang yang benar-benar dikirim.</p></>}
  </section>
  <p style={{marginTop:55,fontSize:12}}>{shipped?"Dokumen berdasarkan pengiriman, retur dan pembayaran yang tercatat.":"Dokumen pesanan diterbitkan saat order disimpan; nomor nota akan dipakai saat pengiriman pertama."}</p>
  <style>{"@media print {.print-actions{display:none!important}.print-receipt{margin:0!important;padding:0!important;max-width:none!important}body{background:white!important}} @media(max-width:640px){.print-receipt{padding:14px!important}}"}</style>
 </main>;
}
