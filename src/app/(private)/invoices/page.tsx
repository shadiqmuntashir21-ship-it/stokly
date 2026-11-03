import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listInvoices} from "@/lib/order-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {payAction,physicalReceiptAction} from "../order-actions";
export const dynamic="force-dynamic";
const fmt=(n:number)=>rupiah(Math.max(0,n));
export default async function Invoices({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [invoices,params]=await Promise.all([listInvoices(),searchParams]);
 const due=invoices.filter(x=>x.status!=="cancelled"&&Number(x.gross)-Number(x.credit)-Number(x.paid)>0);
 const totalDue=invoices.reduce((s,x)=>s+Math.max(0,Number(x.gross)-Number(x.credit)-Number(x.paid)),0);
 return <><PageHead eyebrow="PENJUALAN / KWITANSI" title="Kwitansi & Pembayaran" description="Satu nomor kwitansi per order, seluruh pengiriman, retur, dan pembayaran direkap bersama."/><Notice success={params.success} error={params.error}/>
 <div className="metrics-grid"><section className="metric"><div className="metric-label">Total order tercatat</div><strong>{invoices.length}</strong></section><section className="metric"><div className="metric-label">Piutang belum dibayar</div><strong>{rupiah(totalDue)}</strong></section></div>
 <Panel title="Catat pembayaran" detail="Nominal dibagikan otomatis ke pengiriman yang masih memiliki tagihan">
  <form action={payAction} className="form-grid">
   <input type="hidden" name="requestKey" value={randomUUID()}/>
   <label className="wide">Nomor kwitansi / Outlet<select name="orderId" required defaultValue=""><option value="" disabled>Pilih kwitansi belum lunas</option>{due.map(i=><option key={i.id} value={i.id}>{i.document_number||"Nomor lama"} · {i.outlet} · sisa {fmt(Number(i.gross)-Number(i.credit)-Number(i.paid))}</option>)}</select></label>
   <label>Nominal bayar (Rp)<input type="number" name="amount" min="0.01" step="0.01" required/></label>
   <label>Metode<select name="method" defaultValue="transfer"><option value="transfer">Transfer</option><option value="cash">Tunai</option><option value="other">Lainnya</option></select></label>
   <label className="wide">Referensi pembayaran<input name="reference" maxLength={120} placeholder="Nomor transfer atau bukti"/></label>
   <SubmitButton className="primary-button" disabled={!due.length}>Simpan Pembayaran</SubmitButton>
  </form>
 </Panel>
 <Panel title="Data kwitansi fisik">
  <form action={physicalReceiptAction} className="form-grid">
   <label className="wide">Kwitansi<select name="orderId" required defaultValue=""><option value="" disabled>Pilih kwitansi</option>{invoices.map(x=><option key={x.id} value={x.id}>{x.document_number||"Nomor belum disesuaikan"} · {x.outlet}</option>)}</select></label>
   <label>Jenis / Warna fisik<input name="type" maxLength={40} placeholder="Kuning / Putih Kuning"/></label>
   <label>Status fisik<select name="status" defaultValue="not_handed_over"><option value="not_handed_over">Belum diserahkan</option><option value="handed_over">Sudah diserahkan</option><option value="returned_to_office">Kembali ke kantor</option></select></label>
   <SubmitButton className="primary-button">Simpan Status Fisik</SubmitButton>
  </form>
 </Panel>
 <Panel title="Rekap Kwitansi Outlet" detail="Amount - Return = Final Amount; Final Amount - Terbayar = Sisa Piutang">
 {invoices.length===0?<Empty label="kwitansi"/>:<div className="table-wrap"><table><thead><tr><th>No. Kwitansi</th><th>TGL</th><th>Outlet</th><th>G.O</th><th>PCS</th><th>Amount</th><th>Return</th><th>Final Amount</th><th>Terbayar</th><th>Sisa Piutang</th><th>Payment</th><th>TGL Bayar</th><th>Metode</th><th>Fisik Kwitansi</th></tr></thead><tbody>{invoices.map(i=>{
 const final=Math.max(0,Number(i.gross)-Number(i.credit));
 const remaining=Math.max(0,final-Number(i.paid));
 const status=i.status==="cancelled"?"Batal":i.deliveries===0?"Belum dikirim":remaining===0?"Lunas":Number(i.paid)>0?"Sebagian":"Belum bayar";
 return <tr key={i.id}><td className="mono">{i.document_number||"Belum direkonsiliasi"}</td><td>{i.ordered_on}</td><td>{i.outlet}</td><td>{i.group_name}</td><td>{i.pcs}</td><td>{rupiah(i.gross)}</td><td>{rupiah(i.credit)}</td><td>{rupiah(final)}</td><td>{rupiah(i.paid)}</td><td>{rupiah(remaining)}</td><td>{status}</td><td>{i.paid_at||"—"}</td><td>{i.payment_method||"—"}</td><td>{i.physical_receipt_type||"—"} / {i.physical_receipt_status}</td></tr>;
 })}</tbody></table></div>}
 </Panel>
 <p className="small-muted">Nomor lama dan transaksi kasir V1 tidak diganti otomatis. Penggabungan historis memerlukan rekonsiliasi agar tidak ada kwitansi ganda.</p>
 </>;
}
