import { requireActor } from "@/lib/access";
import { query } from "@/lib/db";
import { PageHead,Panel,Notice,Empty } from "@/components/ui";
import { addReturn } from "../actions";
export const dynamic="force-dynamic";
export default async function Returns({searchParams}:{searchParams:Promise<{success?:string}>}){
 await requireActor(["owner","admin"]); const params=await searchParams;
 const lines=await query<{sale_id:string;number:string;product_id:string;name:string;quantity:number;remaining:number}>(`
 SELECT s.id sale_id,s.number,p.id product_id,p.name,si.quantity,
 (si.quantity-COALESCE((SELECT SUM(r.quantity)::int FROM sale_returns r WHERE r.sale_id=si.sale_id AND r.product_id=si.product_id),0)) remaining
 FROM sales s JOIN sale_items si ON si.sale_id=s.id JOIN products p ON p.id=si.product_id
 WHERE s.status='completed' ORDER BY s.created_at DESC LIMIT 100`);
 const available=lines.filter(x=>x.remaining>0);
 const entries=await query<{id:string;created_at:Date;number:string;name:string;quantity:number;restock:boolean;note:string}>(`
 SELECT r.id,r.created_at,s.number,p.name,r.quantity,r.restock,r.note
 FROM sale_returns r JOIN sales s ON s.id=r.sale_id JOIN products p ON p.id=r.product_id
 ORDER BY r.created_at DESC LIMIT 60`);
 return <><PageHead eyebrow="TRANSACTIONS / RETURNS" title="Retur Penjualan"
 description="Catat pengembalian pelanggan dan sesuaikan stok berdasarkan kondisi barang."/><Notice success={params.success}/>
 <Panel title="Catat retur"><form action={addReturn} className="form-grid">
   <label className="wide">Transaksi dan produk<select required name="line" defaultValue="">
     <option disabled value="">Pilih transaksi untuk diretur</option>
     {available.map((x,i)=><option key={i} value={x.sale_id+"|"+x.product_id}>
       {x.number} — {x.name} (tersisa {x.remaining} unit)
     </option>)}
   </select></label>
   <label>Jumlah<input min="1" step="1" type="number" required name="quantity"/></label>
   <label>Kondisi barang<select name="restock" defaultValue="yes">
     <option value="yes">Layak jual — tambah stok</option>
     <option value="no">Rusak — tidak tambah stok</option>
   </select></label>
   <label className="wide">Alasan retur<input name="note" required maxLength={400} placeholder="Alasan pengembalian barang"/></label>
   <button type="submit" className="primary-button" disabled={!available.length}>Konfirmasi retur</button>
 </form><p className="small-muted" style={{padding:"0 24px 20px"}}>
 Retur ini mencatat jumlah dan kondisi barang. Pengembalian dana belum terintegrasi dan harus ditangani melalui prosedur keuangan terpisah.
 </p></Panel>
 <Panel title="Riwayat retur">{entries.length===0?<Empty label="retur"/>:<div className="table-wrap">
 <table><thead><tr><th>Tanggal</th><th>Transaksi</th><th>Produk</th><th>Jumlah</th><th>Kondisi</th><th>Alasan</th></tr></thead>
 <tbody>{entries.map(e=><tr key={e.id}><td>{new Date(e.created_at).toLocaleDateString("id-ID")}</td><td>{e.number}</td>
 <td>{e.name}</td><td>{e.quantity}</td><td>{e.restock?"Layak jual":"Rusak"}</td><td>{e.note}</td></tr>)}</tbody></table>
 </div>}</Panel></>;
}
