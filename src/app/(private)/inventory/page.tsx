import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {newAssetAction,assetMovementAction} from "../go-actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Asset={id:string;name:string;quantity:number;unit_price:string|null;total_cost:string|null;loaned:number};
type Movement={movement_date:string;kind:string;quantity:number;asset:string;outlet:string|null};
type Basket={source_row:number;basket_type:string|null;outlet_name:string|null;quantity:number|null;reported_balance:number|null;note:string|null};
export default async function Inventory({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [assets,moves,old,outlets,p]=await Promise.all([
  query<Asset>("SELECT a.id::text,a.name,a.quantity,a.unit_price::text,a.total_cost::text,COALESCE((SELECT SUM(CASE WHEN kind='OUT' THEN quantity WHEN kind='RETURN' THEN -quantity ELSE 0 END) FROM inventory_asset_movements m WHERE m.asset_id=a.id),0)::int loaned FROM inventory_assets a ORDER BY a.name LIMIT 300"),
  query<Movement>("SELECT m.movement_date::text,m.kind,m.quantity,a.name asset,o.name outlet FROM inventory_asset_movements m JOIN inventory_assets a ON a.id=m.asset_id LEFT JOIN outlets o ON o.id=m.outlet_id ORDER BY m.created_at DESC LIMIT 100"),
  query<Basket>("SELECT source_row,basket_type,outlet_name,quantity,reported_balance,note FROM legacy_basket_movements ORDER BY source_row LIMIT 100"),
  query<{id:string;name:string}>("SELECT id::text,name FROM outlets WHERE active=true ORDER BY name LIMIT 300"),
  searchParams
 ]);
 return <>
 <PageHead eyebrow="ADMIN / ASET USAHA" title="Inventaris & Keranjang" description="Pelacakan aset, jumlah yang dimiliki, peminjaman ke outlet, barang kembali, rusak, dan hilang."/><Notice success={p.success} error={p.error}/>
 <div className="metrics-grid"><section className="metric"><div className="metric-label">Jenis aset</div><strong>{assets.length}</strong></section>
 <section className="metric"><div className="metric-label">Unit tercatat</div><strong>{assets.reduce((n,x)=>n+x.quantity,0)}</strong></section>
 <section className="metric"><div className="metric-label">Unit dipinjam</div><strong>{assets.reduce((n,x)=>n+Math.max(0,x.loaned),0)}</strong></section></div>
 <Panel title="Tambah jenis inventaris"><form action={newAssetAction} className="form-grid"><label>Nama aset<input name="name" minLength={2} maxLength={150} required/></label>
 <label>Jumlah awal<input name="quantity" type="number" min="0" step="1" required/></label>
 <label className="wide">Keterangan<input name="note" maxLength={400}/></label><SubmitButton className="primary-button">Simpan Aset</SubmitButton></form></Panel>
 <Panel title="Catat pergerakan aset dan keranjang"><form action={assetMovementAction} className="form-grid">
  <label className="wide">Barang<select name="assetId" defaultValue="" required><option value="" disabled>Pilih aset</option>{assets.map(x=><option key={x.id} value={x.id}>{x.name} · total {x.quantity} · dipinjam {x.loaned}</option>)}</select></label>
  <label>Tanggal<input name="date" type="date" required defaultValue={today()}/></label>
  <label>Jenis<select name="kind" defaultValue="OUT"><option value="OUT">Dipinjamkan ke outlet</option><option value="RETURN">Dikembalikan</option><option value="IN">Penambahan aset</option><option value="DAMAGED">Rusak</option><option value="LOST">Hilang</option><option value="ADJUST">Penyesuaian/cek fisik</option></select></label>
  <label>Jumlah<input name="quantity" type="number" min="1" step="1" required/></label>
  <label>Outlet (bila relevan)<select name="outletId" defaultValue=""><option value="">Tidak terkait outlet</option>{outlets.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  <label className="wide">Keterangan<input name="note" maxLength={400}/></label>
  <SubmitButton className="primary-button">Catat Pergerakan</SubmitButton>
 </form></Panel>
 <Panel title="Daftar inventaris"><div className="table-wrap"><table><thead><tr><th>Barang</th><th>Dimiliki</th><th>Dipinjam</th><th>Tersedia (perkiraan)</th><th>Nilai historis</th></tr></thead><tbody>
 {assets.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.quantity}</td><td>{x.loaned}</td><td>{Math.max(0,x.quantity-x.loaned)}</td><td>{rupiah(x.total_cost)}</td></tr>)}</tbody></table></div></Panel>
 <Panel title="Riwayat peminjaman / pengembalian"><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Barang</th><th>Jenis</th><th>Jumlah</th><th>Outlet</th></tr></thead><tbody>
 {moves.map((x,i)=><tr key={i}><td>{x.movement_date}</td><td>{x.asset}</td><td>{x.kind}</td><td>{x.quantity}</td><td>{x.outlet||"—"}</td></tr>)}</tbody></table></div></Panel>
 <Panel title="Riwayat Keranjang KELAPA GO (referensi)"><div className="table-wrap"><table><thead><tr><th>Jenis</th><th>Outlet</th><th>Jumlah</th><th>Saldo tertulis</th><th>Catatan</th></tr></thead><tbody>
 {old.map(x=><tr key={x.source_row}><td>{x.basket_type||"—"}</td><td>{x.outlet_name||"—"}</td><td>{x.quantity??"—"}</td><td>{x.reported_balance??"—"}</td><td>{x.note||"—"}</td></tr>)}</tbody></table></div>
 <p className="form-hint">Data keranjang lama adalah catatan historis, bukan peminjaman baru otomatis. Cocokkan jumlah fisik dan outlet yang memegang keranjang sebelum menggunakannya sebagai saldo tersedia.</p></Panel>
 </>;
}
