import { randomUUID } from "node:crypto";
import { requireActor } from "@/lib/access";
import { listProducts,listSales } from "@/lib/operations";
import { PageHead, Panel, Notice, rupiah,Empty } from "@/components/ui";
import { addSale } from "../actions";
export const dynamic="force-dynamic";
export default async function Sales({searchParams}:{searchParams:Promise<{success?:string}>}){
 const actor=await requireActor();const [products,sales,params]=await Promise.all([listProducts(),listSales(actor.id,actor.role),searchParams]);
 return <><PageHead eyebrow="TRANSACTIONS / SALES" title="Penjualan" description="Catat penjualan dan kurangi persediaan secara otomatis."/><Notice success={params.success}/>
 <Panel title="Transaksi baru" detail="Harga mengikuti master produk"><form action={addSale} className="form-grid"><input type="hidden" name="key" value={randomUUID()}/><label>Produk<select name="product" required defaultValue=""><option disabled value="">Pilih produk</option>{products.filter(p=>p.stock>0).map(p=><option key={p.id} value={p.id}>{p.name} — stok {p.stock} — {rupiah(p.price)}</option>)}</select></label><label>Jumlah<input type="number" name="quantity" min="1" step="1" required placeholder="0"/></label><button disabled={!products.some(p=>p.stock>0)} className="primary-button">Selesaikan penjualan</button></form><p className="small-muted" style={{marginTop:14}}>Transaksi akan dicatat sebagai selesai. Pastikan pembayaran diterima sebelum mengonfirmasi.</p></Panel>
 <Panel title="Riwayat penjualan">{sales.length===0?<Empty label="transaksi"/>:<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Petugas</th><th>Nilai</th><th>Status</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td className="mono">{s.number}</td><td>{new Date(s.created_at).toLocaleDateString("id-ID")}</td><td>{s.actor_name}</td><td>{rupiah(s.total)}</td><td><span className="status-success">Selesai</span></td></tr>)}</tbody></table></div>}</Panel></>;
}
