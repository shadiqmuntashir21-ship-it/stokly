import Link from "next/link";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
type Note={id:string;document_number:string;delivered_on:string;outlet:string;gross:string;retur:string;paid:string;pcs:number};
export default async function Notes(){
 await requireActor(["owner","admin"]);
 const records=await query<Note>("SELECT d.id::text,d.document_number,d.delivered_on::text,o.name outlet,i.gross::text AS gross,COALESCE((SELECT SUM(r.credit_amount) FROM delivery_returns r WHERE r.delivery_id=d.id),0)::text AS retur,COALESCE((SELECT SUM(p.amount) FROM delivery_payments p WHERE p.invoice_id=i.id),0)::text AS paid,COALESCE((SELECT SUM(di.quantity) FROM delivery_note_items di WHERE di.delivery_id=d.id),0)::int AS pcs FROM delivery_notes d JOIN customer_orders c ON c.id=d.order_id JOIN outlets o ON o.id=c.outlet_id JOIN delivery_invoices i ON i.delivery_id=d.id ORDER BY d.created_at DESC LIMIT 250");
 return <><PageHead eyebrow="PENGIRIMAN / NOTA OTOMATIS" title="Nota per Pengiriman" description="Nomor nota dibuat otomatis ketika pengiriman dikonfirmasi. Satu pengiriman satu kuitansi; order bertahap dapat memiliki lebih dari satu kuitansi."/>
 <Panel title="Riwayat kuitansi terbit" detail={records.length+" pengiriman terbaru"}>
 <div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Outlet</th><th>PCS</th><th>Tagihan bersih</th><th>Bayar</th><th>Sisa</th><th>Cetak</th></tr></thead><tbody>
 {records.map(x=><tr key={x.id}><td className="mono">{x.document_number}</td><td>{x.delivered_on}</td><td>{x.outlet}</td><td>{x.pcs}</td><td>{rupiah(Number(x.gross)-Number(x.retur))}</td><td>{rupiah(x.paid)}</td><td>{rupiah(Math.max(0,Number(x.gross)-Number(x.retur)-Number(x.paid)))}</td><td><Link href={"/invoices/notes/"+x.id+"/print"}>Cetak</Link></td></tr>)}
 </tbody></table></div></Panel><p><Link href="/invoices">Kembali ke Kwitansi & Pembayaran →</Link></p></>;
}
