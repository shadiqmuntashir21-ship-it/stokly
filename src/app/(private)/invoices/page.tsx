import {randomUUID} from "node:crypto";
import Link from "next/link";
import {requireActor} from "@/lib/access";
import {listInvoices} from "@/lib/order-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {PaymentComposer} from "@/components/payment-composer";
import {invoiceBalance} from "@/lib/business-math";
import {listPendingRefunds} from "@/lib/return-operations";
import {settleRefundAction} from "../outlet-returns/actions";
import {payAction,physicalReceiptAction} from "../order-actions";
export const dynamic="force-dynamic";
const fmt=(n:number)=>rupiah(Math.max(0,n));
export default async function Invoices({searchParams}:{searchParams:Promise<{success?:string;error?:string;search?:string;page?:string;pay?:string;filter?:string}>}){
 const actor=await requireActor(["owner","admin"]);
 const params=await searchParams;
 const page=Math.max(1,Math.min(100000,Number(params.page)||1));
 const [invoices,selected,refunds]=await Promise.all([
  listInvoices({search:params.search||"",limit:100,offset:(page-1)*100}),
  params.pay?listInvoices({orderId:params.pay,limit:1}):Promise.resolve([]),
  actor.role==="owner"?listPendingRefunds():Promise.resolve([])
 ]);
 const paymentPool=[...invoices,...selected.filter(x=>!invoices.some(i=>i.id===x.id))];

 const due=invoices.filter(x=>x.status!=="cancelled"&&Number(x.gross)-Number(x.credit)-Number(x.paid)>0);
 const totalDue=invoices.reduce((s,x)=>s+Math.max(0,Number(x.gross)-Number(x.credit)-Number(x.paid)),0);
 return <><PageHead eyebrow="PENJUALAN / KWITANSI" title="Kwitansi & Pembayaran" description="Satu nomor kwitansi per order, seluruh pengiriman, retur, dan pembayaran direkap bersama."/><Notice success={params.success} error={params.error}/>
 <div className="metrics-grid"><section className="metric"><div className="metric-label">Total order tercatat</div><strong>{invoices.length}</strong></section><section className="metric"><div className="metric-label">Piutang belum dibayar</div><strong>{rupiah(totalDue)}</strong></section></div>
 <Panel title="Catat pembayaran" detail="Pilih kwitansi, nominal sisa tagihan akan muncul otomatis">
  <PaymentComposer invoices={paymentPool} requestKey={randomUUID()} initialOrder={params.pay||""}/>
 </Panel>

 {actor.role==="owner"&&refunds.length>0&&<Panel title="Refund perlu diselesaikan" detail={refunds.length+" kewajiban refund atas retur yang telah dibayar"}>
  <div className="product-manage-list">{refunds.map(r=><section className="manage-item" key={r.id}>
   <div className="manage-item-head"><strong>{r.document_number||"Nomor lama"} · {r.outlet}</strong><span className="status-danger">{rupiah(r.amount)}</span></div>
   <form action={settleRefundAction} className="form-grid">
    <input name="id" type="hidden" value={r.id}/>
    <label>Metode refund<select name="method" defaultValue="transfer"><option value="transfer">Transfer</option><option value="cash">Tunai</option><option value="other">Lainnya</option></select></label>
    <label>Referensi/bukti<input name="reference" required minLength={3} maxLength={120} placeholder="Nomor referensi pengembalian"/></label>
    <SubmitButton className="primary-button">Catat Refund Terbayar</SubmitButton>
   </form>
  </section>)}</div>
 </Panel>}
 <details className="edit-detail"><summary>Pengaturan kwitansi fisik</summary><Panel title="Data kwitansi fisik">
  <form action={physicalReceiptAction} className="form-grid">
   <label className="wide">Kwitansi<select name="orderId" required defaultValue=""><option value="" disabled>Pilih kwitansi</option>{invoices.map(x=><option key={x.id} value={x.id}>{x.document_number||"Nomor belum disesuaikan"} · {x.outlet}</option>)}</select></label>
   <label>Jenis / Warna fisik<input name="type" maxLength={40} placeholder="Kuning / Putih Kuning"/></label>
   <label>Status fisik<select name="status" defaultValue="not_handed_over"><option value="not_handed_over">Belum diserahkan</option><option value="handed_over">Sudah diserahkan</option><option value="returned_to_office">Kembali ke kantor</option></select></label>
   <SubmitButton className="primary-button">Simpan Status Fisik</SubmitButton>
  </form>
 </Panel>
 </details><p><a className="primary-button" href="/api/receipts/export">Unduh Seluruh Rekap CSV</a></p><Panel title="Rekap Kwitansi Outlet" detail="Cari berdasarkan nomor atau nama outlet, lalu buka detail transaksi">
 <form method="get" className="form-grid">
  <label className="wide">Cari kwitansi / outlet<input name="search" defaultValue={params.search||""} placeholder="Contoh 9000000 atau nama outlet"/></label>
  <SubmitButton className="primary-button">Cari Transaksi</SubmitButton>
 </form>
 <p className="form-hint">Amount - Return = Final Amount. Final Amount - Terbayar = Sisa Piutang.</p>
 {invoices.length===0?<Empty label="kwitansi"/>:<div className="table-wrap"><table><thead><tr><th>No. Kwitansi</th><th>TGL</th><th>Outlet</th><th>G.O</th><th>PCS</th><th>Amount</th><th>Return</th><th>Final Amount</th><th>Terbayar</th><th>Sisa Piutang</th><th>Payment</th><th>TGL Bayar</th><th>Metode</th><th>Fisik Kwitansi</th></tr></thead><tbody>{invoices.map(i=>{
 const {final,due:remaining}=invoiceBalance(i.gross,i.credit,i.paid);
 const status=i.status==="cancelled"?"Batal":i.deliveries===0?"Belum dikirim":remaining===0?"Lunas":Number(i.paid)>0?"Sebagian":"Belum bayar";
 return <tr key={i.id}><td className="mono"><Link href={"/receipts/"+i.id+"/print"}>{i.document_number||"Menunggu nomor / legacy"}</Link></td><td>{i.ordered_on}</td><td>{i.outlet}</td><td>{i.group_name}</td><td>{i.pcs}</td><td>{rupiah(i.gross)}</td><td>{rupiah(i.credit)}</td><td>{rupiah(final)}</td><td>{rupiah(i.paid)}</td><td>{rupiah(remaining)}</td><td>{status}</td><td>{i.paid_at||"—"}</td><td>{i.payment_method||"—"}</td><td>{i.physical_receipt_type||"—"} / {i.physical_receipt_status}</td></tr>;
 })}</tbody></table></div>}
 <p className="form-hint">Halaman {page}, maksimal 100 transaksi per halaman.</p>
 <div style={{display:"flex",gap:14,padding:"8px 16px"}}>
  {page>1&&<Link href={"/invoices?page="+(page-1)+"&search="+encodeURIComponent(params.search||"")}>← Sebelumnya</Link>}
  {invoices.length===100&&<Link href={"/invoices?page="+(page+1)+"&search="+encodeURIComponent(params.search||"")}>Selanjutnya →</Link>}
 </div>
 </Panel>
 <p className="small-muted">Nomor lama dan transaksi kasir V1 tidak diganti otomatis. Penggabungan historis memerlukan rekonsiliasi agar tidak ada kwitansi ganda.</p>
 </>;
}
