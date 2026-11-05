import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {query} from "@/lib/db";
import {legacyReceiptsSummary,legacyOutletSummary} from "@/lib/legacy-payments";
import {PageHead,Panel,rupiah} from "@/components/ui";
export const dynamic="force-dynamic";
type Source={source_sheet:string;count:number};
type CashGroup={category:string;entry_count:number;total_in:string;total_out:string};
type SourceRow={source_row:number;data:unknown[]};
type SalesDay={issued_on:string;receipt_count:number;pieces:number;gross:string;return_value:string;net_sales:string};
type OutletDay={issued_on:string;outlet_name:string;receipt_count:number;pieces:number;net_sales:string};
type CashAdvance={source_row:number|null;entry_date:string|null;description:string;amount:string;category:string|null;origin:string};
export default async function KelapaGoHistory({searchParams}:{searchParams:Promise<{sheet?:string}>}){
 await requireOwner();
 const p=await searchParams;
 const [summary,outlets,sourceList,groups,stock,days,perOutlet,advances]=await Promise.all([
  legacyReceiptsSummary(),legacyOutletSummary(),
  query<Source>("SELECT source_sheet,count(*)::int AS count FROM legacy_source_rows GROUP BY source_sheet ORDER BY source_sheet"),
  query<CashGroup>("SELECT category,entry_count,total_in::text,total_out::text FROM v_go_cash_category_live ORDER BY entry_count DESC"),
  query<{quantity:number;snapshot_date:string|null;status:string}>("SELECT quantity,snapshot_date::text,status FROM legacy_stock_snapshots WHERE source_sheet='STOCK KM'"),
  query<SalesDay>("SELECT issued_on::text,receipt_count,pieces,gross::text,return_value::text,net_sales::text FROM v_go_sales_daily ORDER BY issued_on DESC LIMIT 40"),
  query<OutletDay>("SELECT issued_on::text,outlet_name,receipt_count,pieces,net_sales::text FROM v_go_outlet_daily ORDER BY issued_on DESC,pieces DESC LIMIT 100"),
  query<CashAdvance>("SELECT source_row,entry_date::text,description,amount::text,category,origin FROM v_go_kasbon ORDER BY entry_date DESC NULLS LAST LIMIT 80")
 ]);
 const available=sourceList.find(x=>x.source_sheet===p.sheet);
 const selected=available?.source_sheet||"";
 const rows=selected?await query<SourceRow>("SELECT source_row,data FROM legacy_source_rows WHERE source_sheet=$1 ORDER BY source_row LIMIT 80",[selected]):[];
 const redacted=(r:SourceRow):string[]=>{
  const a=r.data.slice(0,12).map(v=>v===null?"":String(v));
  if(selected==="MAN POWER")return a.map((s,i)=>[4,6].includes(i)&&s.length>4?"••••"+s.slice(-4):s);
  if(selected==="SUPPLIER")return a.map((s,i)=>[3,4].includes(i)&&s.length>4?"••••"+s.slice(-4):s);
  return a;
 };
 return <>
 <PageHead eyebrow="OWNER / DATA AWAL" title="KELAPA GO — Migrasi & Rekap Otomatis" description="Semua sheet yang diizinkan tersimpan sebagai sumber referensi. Pivot dihitung ulang dari transaksi; tidak ditambahkan sebagai penjualan ganda."/>
 <div className="metrics-grid">
  <section className="metric"><div className="metric-label">Kwitansi historis</div><strong>{summary.stat.receipts}</strong></section>
  <section className="metric"><div className="metric-label">Penjualan historis bruto</div><strong>{rupiah(summary.stat.gross)}</strong></section>
  <section className="metric"><div className="metric-label">Piutang terkonfirmasi</div><strong>{rupiah(summary.stat.unpaid_amount)}</strong></section>
  <section className="metric"><div className="metric-label">Stok historis terakhir*</div><strong>{stock[0]?.quantity??"—"} butir</strong></section>
 </div>
 <Panel title="Pivot UNPAID — otomatis" detail="Dihitung dari KWITANSI dan pembayaran yang sudah dicatat dalam STOKLY">
  <p className="form-hint">Kuitansi UNPAID yang sudah dibayar melalui STOKLY langsung berkurang dari daftar ini. Kuitansi status PARTIAL/blank memerlukan rekonsiliasi karena jumlah pembayaran lama belum diketahui secara pasti.</p>
  <p><Link href="/invoices/legacy">Lihat, cari dan catat pembayaran kuitansi lama →</Link></p>
  <div className="table-wrap"><table><thead><tr><th>Nota</th><th>Outlet</th><th>Tanggal</th><th>Sisa pasti</th><th>Status</th></tr></thead><tbody>
   {summary.unpaid.slice(0,35).map(x=><tr key={x.document_number}><td>{x.document_number}</td><td>{x.outlet_name}</td><td>{x.issued_on||"—"}</td><td>{x.needs_reconciliation?"Perlu cek":rupiah(x.confirmed_due??0)}</td><td>{x.status}</td></tr>)}
  </tbody></table></div>
 </Panel>
 <Panel title="Pivot Kwitansi / JUALAN — ringkasan outlet otomatis">
  <div className="table-wrap"><table><thead><tr><th>Outlet</th><th>Nota</th><th>PCS</th><th>Penjualan bersih historis</th><th>Piutang pasti</th><th>Butuh rekonsiliasi</th></tr></thead><tbody>
   {outlets.slice(0,60).map(x=><tr key={x.outlet_name}><td>{x.outlet_name}</td><td>{x.receipt_count}</td><td>{x.total_pcs}</td><td>{rupiah(x.net_sales)}</td><td>{rupiah(x.confirmed_unpaid)}</td><td>{x.needs_reconciliation}</td></tr>)}
  </tbody></table></div>
  <p className="form-hint">Angka historis dan transaksi baru dipisahkan, sehingga laporan tidak menggandakan kuitansi yang sama.</p>
 </Panel>
 <Panel title="Pivot Kas Kecil — rekap kategori otomatis">
  <div className="table-wrap"><table><thead><tr><th>Kategori</th><th>Jumlah catatan</th><th>Kas masuk</th><th>Kas keluar</th></tr></thead><tbody>
   {groups.map(x=><tr key={x.category}><td>{x.category}</td><td>{x.entry_count}</td><td>{rupiah(x.total_in)}</td><td>{rupiah(x.total_out)}</td></tr>)}
  </tbody></table></div><p><Link href="/cash">Buku kas kecil operasional →</Link></p>
 </Panel>
 <Panel title="JUALAN harian — dihitung otomatis">
  <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kwitansi</th><th>PCS</th><th>Penjualan bruto</th><th>Retur</th><th>Penjualan bersih</th></tr></thead><tbody>
   {days.map(d=><tr key={d.issued_on}><td>{d.issued_on}</td><td>{d.receipt_count}</td><td>{d.pieces}</td><td>{rupiah(d.gross)}</td><td>{rupiah(d.return_value)}</td><td>{rupiah(d.net_sales)}</td></tr>)}
  </tbody></table></div>
 </Panel>
 <Panel title="STOK OUTLET — rekap histori per tanggal" detail="Rekap otomatis dari kuitansi historis, bukan angka pivot yang dihitung ulang sebagai transaksi">
  <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Outlet</th><th>PCS</th><th>Nota</th><th>Penjualan</th></tr></thead><tbody>
   {perOutlet.map((x,i)=><tr key={x.issued_on+"-"+x.outlet_name+"-"+i}><td>{x.issued_on}</td><td>{x.outlet_name}</td><td>{x.pieces}</td><td>{x.receipt_count}</td><td>{rupiah(x.net_sales)}</td></tr>)}
  </tbody></table></div>
  <p className="form-hint">Merupakan pergerakan penjualan per outlet, bukan saldo keranjang atau stok fisik yang masih berada di outlet.</p>
 </Panel>
 <Panel title="Kasbon — daftar otomatis">
  <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Uraian</th><th>Nominal keluar</th><th>Sumber</th></tr></thead><tbody>
   {advances.map((x,i)=><tr key={(x.source_row??"new")+"-"+i}><td>{x.entry_date??"—"}</td><td>{x.description}</td><td>{rupiah(x.amount)}</td><td>{x.origin==="historical"?"Kas kecil lama":"Kas kecil baru"}</td></tr>)}
  </tbody></table></div>
  <p className="form-hint">Kasbon merupakan uang muka/piutang petugas, bukan otomatis biaya laba rugi. Pelunasan dan sisa kasbon lama perlu direkonsiliasi dengan catatan sumber.</p>
 </Panel>
 <Panel title="Arsip sumber spreadsheet" detail={sourceList.length+" sheet, dua sheet yang dikecualikan tidak ikut"}>
  <form method="get" className="form-grid"><label className="wide">Lihat isi data sumber (baca saja)<select name="sheet" defaultValue={selected}>
   <option value="">Pilih sheet</option>{sourceList.map(s=><option key={s.source_sheet} value={s.source_sheet}>{s.source_sheet.trim()} · {s.count} baris</option>)}
  </select></label><button type="submit" className="primary-button">Tampilkan</button></form>
  {selected&&<div className="table-wrap"><table><thead><tr><th>Baris</th><th>Isi sumber (maks. 12 kolom pertama)</th></tr></thead><tbody>
   {rows.map(x=><tr key={x.source_row}><td>{x.source_row}</td><td>{redacted(x).filter(Boolean).join(" · ").slice(0,700)}</td></tr>)}
  </tbody></table></div>}
  <p className="form-hint">*Saldo STOCK KM adalah angka historis tertulis, belum dianggap stok fisik operasional sampai cocok dengan hasil penghitungan ulang. Data karyawan dan rekening yang sensitif tidak ditampilkan lengkap. Data Produksi dan NOTA KELUAR tidak diimpor.</p>
 </Panel>
 </>;
}
