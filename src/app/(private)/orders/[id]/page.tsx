import Link from "next/link";
import {requireActor} from "@/lib/access";
import {getOrderDraft,listOrderAudit,listInvoices} from "@/lib/order-operations";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {invoiceBalance} from "@/lib/business-math";
import {editDraftAction,cancelDraftAction} from "../../order-actions";
export const dynamic="force-dynamic";
export default async function OrderDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{success?:string;error?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const {id}=await params;
 const [order,audit,invoice,flags]=await Promise.all([getOrderDraft(id),listOrderAudit(id),actor.role==="marketing"?Promise.resolve([]):listInvoices({orderId:id}),searchParams]);
 if(!order)return <p>Order tidak ditemukan. <Link href="/orders">Kembali ke daftar</Link></p>;
 const canEdit=order.status==="confirmed"&&order.items.every(x=>x.shipped===0)&&actor.role!=="marketing";
 const ledger=invoice[0];
 const due=ledger?invoiceBalance(ledger.gross,ledger.credit,ledger.paid).due:0;
 return <><PageHead eyebrow="TRANSAKSI / DETAIL" title={"Order "+(order.document_number||"Belum bernomor")} description={order.outlet+" · "+order.status.replaceAll("_"," ")}/><Notice success={flags.success} error={flags.error}/>
 <p><Link href="/orders">← Kembali ke order</Link> · <Link href={"/orders?repeat="+id}>Salin sebagai order baru</Link></p>
 {actor.role==="owner"&&!order.document_number&&<p className="form-hint">Order lama belum mempunyai nomor kwitansi. <Link href="/owner/receipts">Tetapkan nomor melalui Room Owner →</Link></p>}
 <Panel title="Rincian barang"><div className="table-wrap"><table><thead><tr><th>Produk</th><th>Dipesan</th><th>Terkirim</th><th>Harga/unit</th><th>Subtotal</th></tr></thead><tbody>
 {order.items.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.quantity}</td><td>{x.shipped}</td><td>{rupiah(x.unit_price)}</td><td>{rupiah(Number(x.unit_price)*x.quantity)}</td></tr>)}
 </tbody></table></div>
 <div style={{padding:16,display:"flex",gap:14,flexWrap:"wrap"}}>
  {actor.role!=="marketing"&&order.status!=="cancelled"&&<Link href={"/orders?dispatch="+id}>Kirim barang →</Link>}
  {actor.role!=="marketing"&&<Link href={"/invoices?pay="+id}>Catat pembayaran →</Link>}
  {actor.role!=="marketing"&&ledger?.document_number&&<Link href={"/receipts/"+id+"/print"}>Cetak kwitansi →</Link>}
  <Link href="/outlet-returns">Retur / komplain →</Link>
 </div>
 </Panel>
 {ledger&&<Panel title="Ringkasan pembayaran"><div style={{padding:18}}>
  <p>Nilai terkirim: {rupiah(ledger.gross)}</p><p>Retur: {rupiah(ledger.credit)}</p>
  <p>Terbayar: {rupiah(ledger.paid)}</p><p>Sisa piutang: {rupiah(due)}</p>
  </div></Panel>}
 {canEdit&&<Panel title="Edit order sebelum dikirim" detail="Harga asli tetap; ubah jumlah dan jadwal, alasan wajib">
 <form className="form-grid" action={editDraftAction}>
  <input type="hidden" name="orderId" value={id}/>
  <input type="hidden" name="itemIds" value={order.items.map(x=>x.id).join(",")}/>
  {order.items.map(x=><label key={x.id}>{x.name} — jumlah<input type="number" min="1" step="1" name={"qty_"+x.id} defaultValue={x.quantity} required/></label>)}
  <label>Tanggal kirim<input name="deliveryDate" type="date" defaultValue={order.desired_delivery||""}/></label>
  <label className="wide">Catatan<input name="note" maxLength={400} defaultValue={order.note}/></label>
  <label className="wide">Alasan perubahan<input name="reason" minLength={5} required maxLength={400} placeholder="Misalnya outlet mengubah jumlah"/></label>
  <SubmitButton className="primary-button">Simpan Perubahan</SubmitButton>
 </form></Panel>}
 {canEdit&&<Panel title="Batalkan order" detail="Nomor kwitansi yang dibatalkan tidak dipakai ulang">
  <form action={cancelDraftAction} className="form-grid"><input type="hidden" name="orderId" value={id}/>
   <label className="wide">Alasan pembatalan<input name="reason" required minLength={5} maxLength={400}/></label>
   <SubmitButton className="primary-button">Batalkan Order Belum Dikirim</SubmitButton>
  </form></Panel>}
 <Panel title="Riwayat perubahan">
  {audit.length===0?<p className="form-hint">Belum ada perubahan atau pembatalan yang tercatat.</p>:<div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Aksi</th><th>Alasan</th></tr></thead><tbody>
   {audit.map((x,i)=><tr key={i}><td>{new Date(x.created_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td><td>{x.action}</td><td>{x.reason}</td></tr>)}
  </tbody></table></div>}
 </Panel>
 </>;
}
