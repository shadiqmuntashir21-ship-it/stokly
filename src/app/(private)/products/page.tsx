import { requireActor } from "@/lib/access";
import { listProducts } from "@/lib/operations";
import {query} from "@/lib/db";
import { Notice,PageHead,Panel,rupiah,Empty } from "@/components/ui";
import {productSave,productPrice,productStock,productArchive} from "../v2-actions";
export const dynamic="force-dynamic";
export default async function Products({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 const actor=await requireActor();
 const [products,params,history]=await Promise.all([
  listProducts(),searchParams,
  query<{name:string;price:string;reason:string;created_at:Date}>(
  "SELECT p.name,h.price::text,h.reason,h.created_at FROM product_price_history h JOIN products p ON p.id=h.product_id WHERE h.outlet_id IS NULL ORDER BY h.created_at DESC LIMIT 15")
 ]);
 const writable=actor.role!=="marketing";
 return <><PageHead eyebrow="MASTER DATA / INVENTORY" title="Produk & Persediaan" description="Ubah produk, harga, stok dan riwayatnya langsung dari STOKLY."/><Notice success={params.success} error={params.error}/>
 {writable&&<Panel title="Tambah produk baru"><form action={productSave} className="form-grid">
  <label>Kode SKU<input name="sku" maxLength={60} required placeholder="PRD-001"/></label>
  <label>Nama produk<input name="name" maxLength={160} required placeholder="Kelapa serut"/></label>
  <label>Kategori<input name="category" defaultValue="Kelapa" required maxLength={90}/></label>
  <label>Satuan<select name="unit" defaultValue="PCS">{["PCS","BUTIR","KG","LITER","CUP","PACK"].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
  <label>Minimum stok<input name="minStock" type="number" min="0" step="1" defaultValue="5" required/></label>
  <label className="wide">Keterangan<input name="description" maxLength={1000} placeholder="Spesifikasi produk / kemasan"/></label>
  <button className="primary-button" type="submit">Tambah Produk</button>
 </form></Panel>}
 <Panel title="Daftar Produk" detail={products.length+" produk aktif"}>
 {products.length===0?<Empty label="produk"/>:<div className="product-manage-list">
 {products.map(p=><section key={p.id} className="manage-item">
  <div className="manage-item-head"><div><strong>{p.name}</strong><p className="small-muted">{p.sku} · {p.category}</p></div>
  <div className="manage-values"><span>Stok: <b>{p.stock}</b></span><span>Harga: <b>{rupiah(p.price)}</b></span></div></div>
  {writable&&<details className="edit-detail"><summary>Kelola produk, harga & stok</summary>
   <div className="edit-forms">
    <form action={productSave} className="mini-form">
     <h3>Edit produk</h3><input type="hidden" name="id" value={p.id}/>
     <label>SKU<input name="sku" defaultValue={p.sku} required/></label>
     <label>Nama<input name="name" defaultValue={p.name} required/></label>
     <label>Kategori<input name="category" defaultValue={p.category}/></label>
     <label>Satuan<select name="unit" defaultValue="PCS">{["PCS","BUTIR","KG","LITER","CUP","PACK"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>Stok minimum<input type="number" min="0" name="minStock" defaultValue={p.min_stock} required/></label>
     <label>Deskripsi<input name="description" defaultValue={p.description} maxLength={1000}/></label>
     <button className="primary-button">Simpan Perubahan</button>
    </form>
    <form action={productPrice} className="mini-form">
     <h3>Ganti harga jual</h3><input type="hidden" name="id" value={p.id}/>
     <label>Harga baru (Rp)<input type="number" min="0" step="1" name="price" defaultValue={p.price} required/></label>
     <label>Alasan perubahan<input name="reason" minLength={5} maxLength={400} required placeholder="Kenaikan harga bahan baku"/></label>
     <button className="primary-button">Simpan Harga</button>
    </form>
    <form action={productStock} className="mini-form">
     <h3>Koreksi stok fisik</h3><input type="hidden" name="id" value={p.id}/>
     <input type="hidden" name="expected" value={p.stock}/>
     <p className="small-muted">Stok saat membuka: {p.stock}. Jika berubah karena transaksi lain, koreksi akan ditolak.</p>
     <label>Stok aktual<input name="actual" type="number" min="0" step="1" defaultValue={p.stock} required/></label>
     <label>Alasan koreksi<input name="reason" minLength={5} maxLength={400} required placeholder="Hasil stock opname"/></label>
     <button className="primary-button">Koreksi Stok</button>
    </form>
   </div>
   <form action={productArchive} className="archive-form"><input type="hidden" name="id" value={p.id}/>
    <button type="submit" className="danger-button">Arsipkan produk</button><span className="small-muted">Data historis tetap disimpan.</span>
   </form>
  </details>}
 </section>)}</div>}</Panel>
 {writable&&<Panel title="Riwayat Perubahan Harga">{history.length===0?<Empty label="perubahan harga"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Harga Baru</th><th>Alasan</th></tr></thead><tbody>{history.map((h,i)=><tr key={i}><td>{new Date(h.created_at).toLocaleDateString("id-ID")}</td><td>{h.name}</td><td>{rupiah(h.price)}</td><td>{h.reason}</td></tr>)}</tbody></table></div>}</Panel>}
 </>;
}
