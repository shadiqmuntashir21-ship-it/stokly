import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listInvoices} from "@/lib/order-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {payAction} from "../order-actions";
export const dynamic="force-dynamic";
export default async function Invoices({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [invoices,params]=await Promise.all([listInvoices(),searchParams]);
 const due=invoices.filter(x=>x.status==="issued"&&Number(x.gross)>Number(x.paid));
 const totalDue=invoices.reduce((sum,x)=>sum+Math.max(0,Number(x.gross)-Number(x.paid)),0);
 return <><PageHead eyebrow="PENJUALAN / TAGIHAN" title="Nota & Pembayaran" description="Nota pengiriman, pembayaran sebagian, lunas dan piutang outlet tersimpan dalam satu sumber data."/><Notice success={params.success} error={params.error}/>
 <div className="metrics-grid"><section className="metric"><div className="metric-label">Total nota terbit</div><strong>{invoices.length}</strong></section><section className="metric"><div className="metric-label">Piutang dalam daftar</div><strong>{rupiah(totalDue)}</strong></section></div>
 <Panel title="Terima pembayaran" detail="Pembayaran tidak boleh melebihi sisa tagihan">
 <form action={payAction} className="form-grid">
  <input name="requestKey" type="hidden" value={randomUUID()}/>
  <label className="wide">Nota<select name="invoiceId" required defaultValue=""><option value="" disabled>Pilih nota belum lunas</option>{due.map(i=><option key={i.id} value={i.id}>{i.document_number} — {i.outlet} — sisa {rupiah(Number(i.gross)-Number(i.paid))}</option>)}</select></label>
  <label>Nominal bayar (Rp)<input name="amount" type="number" min=".01" step=".01" required/></label>
  <label>Metode<select name="method" defaultValue="transfer"><option value="transfer">Transfer</option><option value="cash">Tunai</option><option value="other">Lainnya</option></select></label>
  <label className="wide">Referensi pembayaran<input name="reference" maxLength={120} placeholder="Nomor transfer / bukti pembayaran"/></label>
  <button className="primary-button" disabled={!due.length}>Simpan Pembayaran</button>
 </form></Panel>
 <Panel title="Rekap Nota dan Piutang">{invoices.length===0?<Empty label="nota"/>:<div className="table-wrap"><table><thead><tr><th>No. Nota</th><th>Tanggal Kirim</th><th>Outlet</th><th>Tagihan</th><th>Terbayar</th><th>Sisa Piutang</th><th>Status</th></tr></thead>
 <tbody>{invoices.map(i=><tr key={i.id}><td className="mono">{i.document_number}</td><td>{i.delivered_on}</td><td>{i.outlet}</td><td>{rupiah(i.gross)}</td><td>{rupiah(i.paid)}</td><td>{rupiah(Number(i.gross)-Number(i.paid))}</td><td><span className={Number(i.gross)===Number(i.paid)?"status-success":"status-danger"}>{Number(i.gross)===Number(i.paid)?"Lunas":Number(i.paid)>0?"Sebagian":"Belum bayar"}</span></td></tr>)}</tbody></table></div>}</Panel>
 <p className="small-muted">Pembayaran dan tagihan ini untuk alur order STOKLY V2; transaksi kasir V1 masih tercatat terpisah selama masa migrasi.</p>
 </>;
}
