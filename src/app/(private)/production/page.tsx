import Link from "next/link";
import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {listProducts} from "@/lib/operations";
import {GoProductionComposer} from "@/components/go-production-composer";
import {listProduction} from "@/lib/coconut-operations";
import {PageHead,Panel,Notice,Empty,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Daily={date:string;used:number;damaged:number;produced:number;material_cost:string};
export default async function Production({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [products,availability,runs,daily,p]=await Promise.all([
  listProducts(),
  query<{available:number}>("SELECT COALESCE(SUM(accepted_qty-consumed_qty),0)::int available FROM coconut_batches"),
  listProduction(),
  query<Daily>("SELECT d.production_date::text date,d.coconut_used used,d.damaged_qty damaged,COALESCE((SELECT SUM(quantity)::int FROM coconut_production_day_outputs o WHERE o.production_id=d.id),0)::int produced,d.raw_material_cost::text material_cost FROM coconut_production_days d ORDER BY d.production_date DESC,d.created_at DESC LIMIT 80"),
  searchParams
 ]);
 const available=availability[0]?.available||0,categoryProducts=products.filter(x=>["GO-MAKAN-FULL","GO-KELAPA-TAR","GO-SERUT"].includes(x.sku));
 return <><PageHead eyebrow="ADMIN / HASIL PRODUKSI" title="Produksi Harian" description="Cukup pilih tanggal, jumlah diproses, hasil setiap kategori dan kelapa rusak. Tanpa memilih batch."/>
 <Notice success={p.success} error={p.error}/>
 <div className="metrics-grid"><section className="metric"><div className="metric-label">Bahan lolos QC tersedia</div><strong>{available}</strong></section>
 <section className="metric"><div className="metric-label">Hasil jadi tercatat</div><strong>{daily.reduce((n,x)=>n+x.produced,0)}</strong></section>
 <section className="metric"><div className="metric-label">Rusak saat produksi</div><strong>{daily.reduce((n,x)=>n+x.damaged,0)}</strong></section></div>
 <Panel title="Catat hasil produksi"><GoProductionComposer products={categoryProducts} requestKey={randomUUID()} date={today()} available={available}/>
  {!available&&<p className="form-hint">Belum ada bahan baku lolos QC yang tersedia. <Link href="/procurement">Catat pembelian + QC terlebih dahulu.</Link></p>}
 </Panel>
 <Panel title="Produksi harian terbaru"><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Diproses</th><th>Layak jual</th><th>Rusak</th><th>Biaya bahan baku</th></tr></thead><tbody>
 {daily.map((d,i)=><tr key={i}><td>{d.date}</td><td>{d.used}</td><td>{d.produced}</td><td>{d.damaged}</td><td>{rupiah(d.material_cost)}</td></tr>)}
 </tbody></table></div><p className="form-hint">HPP yang ditampilkan adalah biaya bahan baku teralokasi, belum termasuk seluruh biaya overhead.</p></Panel>
 {runs.length>0&&<Panel title="Riwayat produksi sebelumnya" detail="Data produksi lama tetap dipertahankan">{runs.length===0?<Empty label="produksi"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Produk</th><th>Hasil</th></tr></thead><tbody>
 {runs.map(r=><tr key={r.id+"-"+r.product}><td>{r.production_date}</td><td>{r.supplier}</td><td>{r.product}</td><td>{r.produced_qty}</td></tr>)}
 </tbody></table></div>}</Panel>}
 </>;
}
