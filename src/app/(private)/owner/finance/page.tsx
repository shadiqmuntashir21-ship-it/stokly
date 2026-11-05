import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {ownerMoney,parsePeriod} from "@/lib/owner-money";
import {ownerProductHpp,ownerCostReadiness} from "@/lib/owner-hpp";
import {query} from "@/lib/db";
import {PageHead,Panel,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
export default async function OwnerFinance({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 await requireOwner();const p=await searchParams;const period=parsePeriod(p.from,p.to);
 const [m,hpp,cost,expenses,dailyHpp]=await Promise.all([
  ownerMoney(period),ownerProductHpp(),ownerCostReadiness(),
  query<{cost_class:string;amount:string}>(`SELECT c.cost_class,SUM(e.amount)::text amount FROM expense_entries e JOIN expense_categories c ON c.code=e.category_code WHERE ($1::date IS NULL OR e.incurred_on>=$1) AND ($2::date IS NULL OR e.incurred_on<=$2) GROUP BY c.cost_class ORDER BY c.cost_class`,[period.from,period.to]),
  query<{product:string;qty:number;cost:string;unit_cost:string}>("SELECT p.name product,SUM(o.quantity)::int qty,ROUND(SUM(o.quantity*o.unit_cost),2)::text cost,ROUND(SUM(o.quantity*o.unit_cost)/NULLIF(SUM(o.quantity),0),2)::text unit_cost FROM coconut_production_day_outputs o JOIN products p ON p.id=o.product_id JOIN coconut_production_days d ON d.id=o.production_id WHERE ($1::date IS NULL OR d.production_date>=$1) AND ($2::date IS NULL OR d.production_date<=$2) GROUP BY p.name ORDER BY p.name",[period.from,period.to])
 ]);
 const net=Number(m.gross)-Number(m.returned);
 return <>
  <PageHead eyebrow="OWNER / KEUANGAN & HPP" title="Pusat Keuangan & HPP" description="Pantau nilai terkirim, uang masuk, piutang, biaya, dan biaya produksi per produk. Jangan menyamakan kas masuk dengan laba."/>
  <Panel title="Filter keuangan"><form method="get" className="form-grid"><label>Mulai<input type="date" name="from" defaultValue={period.from||""}/></label><label>Sampai<input type="date" name="to" defaultValue={period.to||""}/></label><button className="primary-button" type="submit">Tampilkan</button></form></Panel>
  <div className="metrics-grid">
   <section className="metric"><div className="metric-label">Penjualan bersih terkirim</div><strong>{rupiah(net)}</strong></section>
   <section className="metric"><div className="metric-label">Uang diterima pada periode</div><strong>{rupiah(m.payments)}</strong></section>
   <section className="metric"><div className="metric-label">Piutang belum lunas (semua waktu)</div><strong>{rupiah(m.outstanding)}</strong></section>
   <section className="metric"><div className="metric-label">Biaya operasional tercatat</div><strong>{rupiah(m.expenses)}</strong></section>
   <section className="metric"><div className="metric-label">Refund belum dibayarkan</div><strong>{rupiah(m.refunds)}</strong></section>
  </div>
  <Panel title="HPP produksi per produk" detail={cost.finished_runs+" proses selesai alokasi dari "+cost.production_runs}>
   {hpp.length?<div className="table-wrap"><table><thead><tr><th>Produk</th><th>Hasil produksi teralokasi</th><th>Total biaya</th><th>HPP rata-rata produksi</th><th>Proses</th></tr></thead><tbody>
    {hpp.map(x=><tr key={x.product_id}><td>{x.product}</td><td>{x.produced_qty} {x.unit}</td><td>{rupiah(x.allocated_cost)}</td><td>{rupiah(x.hpp_unit)} / {x.unit}</td><td>{x.production_count}</td></tr>)}
   </tbody></table></div>:<p className="form-hint">Belum ada proses yang lolos QC lengkap dan alokasi biaya tepat 100%. Lengkapi melalui HPP Produksi.</p>}
   <p className="form-hint">Angka di atas merupakan biaya rata-rata hasil produksi yang sudah teralokasi, bukan HPP barang terjual. Stok lama, koreksi stok dan retur belum mempunyai lapisan biaya FIFO, sehingga margin outlet serta laba bersih belum dapat dihitung secara akuntabel.</p>
   <p><Link href="/costing">Atur alokasi HPP per proses →</Link></p>
  </Panel>
  <Panel title="HPP bahan baku produksi GO (tanpa pilihan batch)" detail="Alokasi otomatis dari pembelian & QC yang sudah dicatat">
   <div className="table-wrap"><table><thead><tr><th>Produk hasil</th><th>Jumlah</th><th>Biaya bahan baku</th><th>Rata-rata per unit</th></tr></thead><tbody>
    {dailyHpp.map(x=><tr key={x.product}><td>{x.product}</td><td>{x.qty}</td><td>{rupiah(x.cost)}</td><td>{rupiah(x.unit_cost)}</td></tr>)}
   </tbody></table></div><p className="form-hint">Biaya produksi lain (upah langsung, kemasan, dan overhead) belum otomatis dikapitalisasi ke stok hariannya; bukan laporan laba bersih final.</p>
  </Panel>
  <Panel title="Biaya menurut klasifikasi">
   <div className="table-wrap"><table><thead><tr><th>Jenis biaya</th><th>Nominal periode</th></tr></thead><tbody>{expenses.map(x=><tr key={x.cost_class}><td>{x.cost_class}</td><td>{rupiah(x.amount)}</td></tr>)}</tbody></table></div>
   <p className="form-hint">Biaya produksi yang sudah dialokasikan tidak boleh dikurangkan lagi sebagai biaya operasional saat menghitung laba. Biaya BBM dan transportasi baru dicatat lewat Kas Kecil; data biaya historis tetap tersimpan sebagai arsip.</p>
  </Panel>
  <Panel title="Kelola keuangan"><div className="quick-links">
   <Link href="/expenses">Catat & lihat biaya operasional →</Link>
   <Link href="/costing">Alokasi HPP produksi →</Link>
   <Link href="/invoices">Kwitansi, piutang, pembayaran & refund →</Link>
   <Link href="/closeout">Penutupan harian →</Link>
   <Link href="/owner/outlets">Analisis outlet →</Link>
  </div></Panel>
 </>;
}
