import { requireActor } from "@/lib/access";
import { listProducts } from "@/lib/operations";
import { Notice,PageHead,Panel,rupiah,Empty } from "@/components/ui";
import { addProduct } from "../actions";
export const dynamic="force-dynamic";
export default async function Products({searchParams}:{searchParams:Promise<{success?:string}>}){
 const actor=await requireActor();const products=await listProducts();const params=await searchParams;
 return <><PageHead eyebrow="MASTER DATA / INVENTORY" title="Produk & Persediaan" description="Kelola katalog, harga jual, dan posisi stok setiap produk."/><Notice success={params.success}/>
 {actor.role!=="marketing"&&<Panel title="Tambah produk" detail="Produk baru"><form action={addProduct} className="form-grid"><label>Kode SKU<input name="sku" maxLength={60} required placeholder="SKU-001"/></label><label>Nama produk<input name="name" required maxLength={160} placeholder="Nama barang"/></label><label>Kategori<input name="category" maxLength={90} placeholder="Umum"/></label><label>Harga jual (Rp)<input name="price" type="number" min="0" step="1" required/></label><label>Stok minimum<input name="minStock" type="number" min="0" step="1" defaultValue="5" required/></label><button className="primary-button">Simpan produk</button></form></Panel>}
 <Panel title="Katalog produk" detail={products.length+" produk"}>{products.length===0?<Empty label="produk"/>:<div className="table-wrap"><table><thead><tr><th>SKU</th><th>Nama produk</th><th>Kategori</th><th>Harga jual</th><th>Stok</th><th>Status</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td className="mono">{p.sku}</td><td className="strong-cell">{p.name}</td><td>{p.category}</td><td>{rupiah(p.price)}</td><td>{p.stock}</td><td><span className={p.stock<=p.min_stock?"status-danger":"status-success"}>{p.stock===0?"Habis":p.stock<=p.min_stock?"Menipis":"Tersedia"}</span></td></tr>)}</tbody></table></div>}</Panel></>;
}
