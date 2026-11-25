import Link from "next/link";
import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {listProducts} from "@/lib/operations";
import {GoProductionComposer} from "@/components/go-production-composer";
import {listProduction} from "@/lib/coconut-operations";
import {finishedStock} from "@/lib/finished-stock";
import {PageHead,Panel,Notice,Empty,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Daily={date:string;used:number;damaged:number;produced:number;material_cost:string};
export default async function Production({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const day=today();
 const [products,availability,runs,daily,p,stock,todayTotals]=await Promise.all([
  listProducts(),
  query<{available:number}>("SELECT COALESCE(SUM(accepted_qty-consumed_qty),0)::int available FROM coconut_batches WHERE voided_at IS NULL"),
  listProduction(),
  query<Daily>("SELECT d.production_date::text date,d.coconut_used used,d.damaged_qty damaged,COALESCE((SELECT SUM(quantity)::int FROM coconut_production_day_outputs o WHERE o.production_id=d.id),0)::int produced,d.raw_material_cost::text material_cost FROM coconut_production_days d ORDER BY d.production_date DESC,d.created_at DESC LIMIT 80"),
  searchParams,finishedStock(day),
  query<{used:number;damaged:number;estimated_loss:string}>("SELECT COALESCE(SUM(coconut_used),0)::int used,COALESCE(SUM(damaged_qty),0)::int damaged,COALESCE(SUM(CASE WHEN coconut_used>0 THEN raw_material_cost*damaged_qty/coconut_used ELSE 0 END),0)::text estimated_loss FROM coconut_production_days WHERE production_date=$1::date",[day])
 ]);
 const available=availability[0]?.available||0,categoryProducts=products.filter(x=>["GO-MAKAN-FULL","GO-KELAPA-TAR","GO-SERUT"].includes(x.sku));
 return <><PageHead eyebrow="ADMIN / HASIL PRODUKSI" title="Produksi Harian" description="Cukup pilih tanggal, jumlah diproses, hasil setiap kategori dan kelapa rusak. Tanpa memilih batch."/>
 <Notice success={p.success} error={p.error}/>
 <div className="metrics-grid"><section className="metric"><div className="metric-label">Bahan lolos QC tersedia</div><strong>{available}</strong></section>
 <section className="metric"><div className="metric-label">Hasil jadi hari ini (unit)</div><strong>{stock.reduce((n,x)=>n+x.produced,0)}</strong></section>
 <section className="metric"><div className="metric-label">Rusak hari ini (butir)</div><strong>{todayTotals[0]?.damaged||0}</strong></section></div>
 <p className="form-hint">Harga jual tiap hasil produksi diatur melalui <Link href="/products">Produk & Stok</Link>. Biaya bahan baku mengikuti harga pembelian grade yang tercatat.</p>
 <Panel title="Stok jadi & distribusi hari ini" detail={day+" · WITA"}>
  <div className="table-wrap"><table><thead><tr><th>Produk</th><th>Satuan</th><th>Produksi hari ini</th><th>Dikirim hari ini</th><th>Stok siap kirim sekarang</th><th>Harga jual standar</th><th>Nilai stok (estimasi jual)</th></tr></thead><tbody>
   {stock.map(x=><tr key={x.sku}><td>{x.name}</td><td>{x.unit}</td><td>{x.produced}</td><td>{x.shipped}</td><td><strong>{x.stock}</strong></td><td>{Number(x.price)>0?rupiah(x.price):"Belum ditetapkan"}</td><td>{Number(x.price)>0?rupiah(x.stock*Number(x.price)):"—"}</td></tr>)}
  </tbody></table></div>
  <p className="form-hint">Stok siap kirim adalah saldo aktual per produk, termasuk sisa hari sebelumnya dan mutasi sah. Pengiriman hari ini dapat memakai stok lama. Kelapa rusak tidak menambah stok jual; estimasi nilai bahan rusak hari ini {rupiah(todayTotals[0]?.estimated_loss||0)} merupakan bagian dari biaya bahan baku, bukan biaya tambahan.</p>
  <p className="form-hint">Satuan Serut adalah PCS; angka antar satuan tidak dijadikan saldo butir. Sisa stok dibawa otomatis ke hari berikutnya. <Link href="/orders">Buka order & pengiriman →</Link></p>
 </Panel>
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
