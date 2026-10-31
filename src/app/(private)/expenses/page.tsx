import {SubmitButton} from "@/components/submit-button";
import {randomUUID} from "node:crypto";
import {requireOwner} from "@/lib/access";
import {outlets} from "@/lib/v2-master";
import {query} from "@/lib/db";
import {financeSnapshot,listExpenseCategories,listExpenses} from "@/lib/expense-operations";
import {PageHead,Panel,Notice,Empty,rupiah} from "@/components/ui";
import {addExpenseAction} from "./actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function Expenses({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireOwner();
 const [cats,entries,snapshot,outletList,productions,params]=await Promise.all([
 listExpenseCategories(),listExpenses(),financeSnapshot(),outlets(),
 query<{id:string;production_date:string}>("SELECT id::text,production_date::text FROM coconut_production ORDER BY created_at DESC LIMIT 100"),
 searchParams]);
 return <><PageHead eyebrow="OWNER / KEUANGAN" title="Biaya & Rekap Keuangan" description="Catat manpower, BBM, gaji dan biaya lainnya dengan klasifikasi yang jelas."/><Notice success={params.success} error={params.error}/>
 <div className="metrics-grid">
  <section className="metric"><div className="metric-label">Penjualan bersih V2 (bruto - retur)</div><strong>{rupiah(snapshot.net)}</strong></section>
  <section className="metric"><div className="metric-label">Pembayaran diterima V2</div><strong>{rupiah(snapshot.paid)}</strong></section>
  <section className="metric"><div className="metric-label">Pembelian kelapa tercatat</div><strong>{rupiah(snapshot.purchases)}</strong></section>
  <section className="metric"><div className="metric-label">Biaya lain dicatat</div><strong>{rupiah(snapshot.costs.reduce((s,c)=>s+c.amount,0))}</strong></section>
 <section className="metric"><div className="metric-label">Retur / kredit nota V2</div><strong>{rupiah(snapshot.credits)}</strong></section>
  <section className="metric"><div className="metric-label">Biaya rute pengiriman</div><strong>{rupiah(snapshot.routeCosts)}</strong></section>
 </div>
 <Panel title="Catat biaya"><form action={addExpenseAction} className="form-grid">
  <input type="hidden" name="requestKey" value={randomUUID()}/>
  <label>Kategori biaya<select name="category" required defaultValue=""><option value="" disabled>Pilih kategori</option>{cats.map(c=><option key={c.code} value={c.code}>{c.name} ({c.cost_class})</option>)}</select></label>
  <label>Nominal (Rp)<input type="number" min=".01" step=".01" name="amount" required/></label>
  <label>Tanggal<input type="date" name="date" defaultValue={today()} required/></label>
  <label>Outlet terkait (khusus distribusi)<select name="outletId" defaultValue=""><option value="">Tidak spesifik</option>{outletList.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  <label className="wide">Proses produksi terkait (khusus biaya produksi)<select name="productionId" defaultValue=""><option value="">Tidak dialokasikan ke proses</option>{productions.map(x=><option key={x.id} value={x.id}>{x.production_date} · {x.id.slice(0,8)}</option>)}</select></label>
  <label className="wide">Keterangan biaya<input name="note" minLength={5} maxLength={400} required placeholder="Contoh: BBM pengantaran area utara"/></label>
  <SubmitButton className="primary-button">Simpan Biaya</SubmitButton>
 </form><p className="form-hint">Biaya produksi yang terkait langsung ke batch bisa dipilih pada Proses Produksi, lalu dialokasikan melalui HPP Produksi. Pembelian kelapa sudah dicatat di Pengadaan, dan biaya perjalanan harus dicatat melalui Rute & Ongkir. Hindari input biaya yang sama dua kali.</p></Panel>
 <Panel title="Biaya berdasarkan jenis">{snapshot.costs.length===0?<Empty label="biaya"/>:<div className="table-wrap"><table><thead><tr><th>Jenis Biaya</th><th>Total</th></tr></thead><tbody>{snapshot.costs.map(c=><tr key={c.className}><td>{c.className}</td><td>{rupiah(c.amount)}</td></tr>)}</tbody></table></div>}</Panel>
 <Panel title="Riwayat biaya">{entries.length===0?<Empty label="pengeluaran"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Outlet</th><th>Nominal</th><th>Keterangan</th></tr></thead><tbody>{entries.map(x=><tr key={x.id}><td>{x.incurred_on}</td><td>{x.name}</td><td>{x.outlet||"—"}</td><td>{rupiah(x.amount)}</td><td>{x.note}</td></tr>)}</tbody></table></div>}</Panel>
 <p className="form-hint">Angka di atas merupakan nilai tercatat, bukan laba bersih. HPP produk terjual dan laba bersih belum dihitung. Nilai pembelian bahan baku, biaya produksi, biaya rute dan biaya operasional harus dialokasikan secara konsisten sebelum profit final dapat ditampilkan.</p>
 </>;
}
