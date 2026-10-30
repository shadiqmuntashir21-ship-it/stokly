import { requireActor } from "@/lib/access";
import { listProducts } from "@/lib/operations";
import { query } from "@/lib/db";
import { addIssue } from "../actions";
import { PageHead, Panel, Notice, Empty } from "@/components/ui";
export const dynamic="force-dynamic";
export default async function GoodsIssues({searchParams}:{searchParams:Promise<{success?:string}>}){
 await requireActor(["owner","admin"]);
 const [products, entries, params]=await Promise.all([
   listProducts(),
   query<{id:string;created_at:Date;name:string;quantity:number;reason:string}>(
     "SELECT g.id,g.created_at,p.name,g.quantity,g.reason FROM goods_issues g JOIN products p ON p.id=g.product_id ORDER BY g.created_at DESC LIMIT 60"),
   searchParams
 ]);
 return <><PageHead eyebrow="INVENTORY / GOODS OUT" title="Barang Keluar"
   description="Catat pemakaian internal, barang rusak, atau pengeluaran di luar penjualan."/><Notice success={params.success}/>
 <Panel title="Pengeluaran nonpenjualan">
   <form action={addIssue} className="form-grid">
     <label>Produk<select name="product" defaultValue="" required>
       <option value="" disabled>Pilih produk</option>
       {products.filter(p=>p.stock>0).map(p=><option key={p.id} value={p.id}>{p.name} — {p.stock} unit</option>)}
     </select></label>
     <label>Jumlah<input name="quantity" type="number" min="1" step="1" required /></label>
     <label className="wide">Alasan pengeluaran<input name="reason" maxLength={400} placeholder="Rusak, sampel, pemakaian internal..." required /></label>
     <button className="primary-button" disabled={!products.some(p=>p.stock>0)}>Konfirmasi pengeluaran</button>
   </form>
 </Panel>
 <Panel title="Riwayat barang keluar">{entries.length===0?<Empty label="pengeluaran"/>:<div className="table-wrap">
   <table><thead><tr><th>Tanggal</th><th>Produk</th><th>Jumlah</th><th>Alasan</th></tr></thead><tbody>
     {entries.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString("id-ID")}</td><td className="strong-cell">{x.name}</td><td>-{x.quantity}</td><td>{x.reason}</td></tr>)}
   </tbody></table>
 </div>}</Panel></>;
}
