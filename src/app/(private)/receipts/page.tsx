import { requireActor } from "@/lib/access";
import { listProducts } from "@/lib/operations";
import { query } from "@/lib/db";
import { addReceipt } from "../actions";
import { PageHead, Panel, Notice, Empty } from "@/components/ui";
export const dynamic="force-dynamic";
export default async function Receipts({searchParams}:{searchParams:Promise<{success?:string}>}){
 await requireActor(["owner","admin"]);const products=await listProducts();const params=await searchParams;
 const entries=await query<{id:string;created_at:Date;note:string;name:string;quantity:number}>(`SELECT r.id,r.created_at,r.note,p.name,m.quantity_delta::int quantity FROM goods_receipts r JOIN stock_movements m ON m.source_id=r.id AND m.source_type='receipt' JOIN products p ON p.id=m.product_id ORDER BY r.created_at DESC LIMIT 50`);
 return <><PageHead eyebrow="INVENTORY / GOODS IN" title="Barang Masuk" description="Setiap penerimaan menambah stok dan menghasilkan riwayat persediaan."/><Notice success={params.success}/>
 <Panel title="Catat penerimaan"><form action={addReceipt} className="form-grid"><label>Produk<select required name="product" defaultValue=""><option value="" disabled>Pilih produk</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — stok {p.stock}</option>)}</select></label><label>Jumlah<input required type="number" min="1" step="1" name="quantity" placeholder="0"/></label><label className="wide">Keterangan<input maxLength={400} name="note" placeholder="Nomor invoice / supplier / keterangan penerimaan"/></label><button className="primary-button" disabled={!products.length}>Konfirmasi barang masuk</button></form></Panel>
 <Panel title="Riwayat penerimaan">{entries.length===0?<Empty label="penerimaan"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Jumlah</th><th>Keterangan</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td>{new Date(e.created_at).toLocaleDateString("id-ID")}</td><td className="strong-cell">{e.name}</td><td>+{e.quantity}</td><td>{e.note||"—"}</td></tr>)}</tbody></table></div>}</Panel></>;
}
