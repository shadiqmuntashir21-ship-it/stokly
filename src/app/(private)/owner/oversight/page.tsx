import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {query} from "@/lib/db";
import {ownerActivity} from "@/lib/owner-operations";
import {PageHead,Panel,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
type PriceChange={document_number:string|null;outlet:string;product:string;standard_price:string;applied_price:string;reason:string;created_at:Date};
type Refund={amount:string;document_number:string|null;outlet:string;status:string;created_at:Date};
export default async function OwnerOversight(){
 await requireOwner();
 const [events,prices,refunds,reconciliations]=await Promise.all([
  ownerActivity(60),
  query<PriceChange>(`SELECT o.document_number,t.name outlet,p.name product,r.standard_price::text,r.applied_price::text,r.reason,r.created_at FROM order_price_overrides r JOIN customer_order_items i ON i.id=r.order_item_id JOIN customer_orders o ON o.id=i.order_id JOIN products p ON p.id=i.product_id JOIN outlets t ON t.id=o.outlet_id ORDER BY r.created_at DESC LIMIT 30`),
  query<Refund>(`SELECT r.amount::text,o.document_number,t.name outlet,r.status,r.created_at FROM delivery_refund_obligations r JOIN delivery_notes d ON d.id=r.delivery_id JOIN customer_orders o ON o.id=d.order_id JOIN outlets t ON t.id=o.outlet_id ORDER BY r.created_at DESC LIMIT 30`),
  query<{document_number:string;method:string;created_at:Date}>(`SELECT document_number,method,created_at FROM receipt_number_reconciliations ORDER BY created_at DESC LIMIT 30`)
 ]);
 return <><PageHead eyebrow="OWNER / PENGAWASAN" title="Audit & Pengawasan" description="Perubahan harga khusus, refund, penomoran lama, serta aktivitas transaksi yang perlu diketahui Owner."/>
 <Panel title="Perubahan harga khusus per order">
  {prices.length?<div className="table-wrap"><table><thead><tr><th>Nota</th><th>Outlet</th><th>Produk</th><th>Harga biasa</th><th>Harga transaksi</th><th>Alasan</th></tr></thead><tbody>{prices.map((x,i)=><tr key={i}><td>{x.document_number||"Legacy"}</td><td>{x.outlet}</td><td>{x.product}</td><td>{rupiah(x.standard_price)}</td><td>{rupiah(x.applied_price)}</td><td>{x.reason}</td></tr>)}</tbody></table></div>:<p className="form-hint">Belum ada perubahan harga khusus.</p>}
 </Panel>
 <Panel title="Pengembalian dana (refund)">
  {refunds.length?<div className="table-wrap"><table><thead><tr><th>Nota</th><th>Outlet</th><th>Jumlah</th><th>Status</th></tr></thead><tbody>{refunds.map((x,i)=><tr key={i}><td>{x.document_number||"Legacy"}</td><td>{x.outlet}</td><td>{rupiah(x.amount)}</td><td>{x.status}</td></tr>)}</tbody></table></div>:<p className="form-hint">Belum ada refund.</p>}
  <p><Link href="/invoices">Buka pembayaran dan selesaikan kewajiban refund →</Link></p>
 </Panel>
 <Panel title="Riwayat penomoran kwitansi lama">
  {reconciliations.length?<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Metode</th><th>Waktu WITA</th></tr></thead><tbody>{reconciliations.map((x,i)=><tr key={i}><td>{x.document_number}</td><td>{x.method==="new_sequence"?"Nomor baru STOKLY":"Nomor fisik lama"}</td><td>{new Date(x.created_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td></tr>)}</tbody></table></div>:<p className="form-hint">Belum ada rekonsiliasi.</p>}
  <p><Link href="/owner/receipts">Kelola nomor kwitansi yang belum tercatat →</Link></p>
 </Panel>
 <Panel title="Aktivitas aplikasi terbaru"><div className="table-wrap"><table><thead><tr><th>Waktu WITA</th><th>Aksi</th><th>Jenis data</th><th>Akses sistem</th></tr></thead>
  <tbody>{events.map((e,i)=><tr key={i}><td>{new Date(e.created_at).toLocaleString("id-ID",{timeZone:"Asia/Makassar"})}</td><td>{e.action}</td><td>{e.entity}</td><td>{e.actor_id.startsWith("stokly:room:")?e.actor_id.replace("stokly:room:","Room "):"Owner / pengguna terotorisasi"}</td></tr>)}</tbody></table></div>
  <p className="form-hint">Karena Admin dan Marketing tetap bebas masuk sesuai kebutuhan, jejak audit room belum mengidentifikasi petugas per orang. Aktivitas sensitif sebaiknya ditinjau Owner.</p>
 </Panel>
 </>;
}
