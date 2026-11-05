import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {newCashEntryAction} from "../go-actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Entry={id:string;entry_date:string;direction:string;category:string;description:string;amount:string};
type Legacy={source_row:number;entry_date:string|null;description:string;money_in:string;money_out:string;recorded_balance:string|null;category:string|null};
export default async function Cash({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [p,entries,history,summary]=await Promise.all([
  searchParams,
  query<Entry>("SELECT id::text,entry_date::text,direction,category,description,amount::text FROM cash_ledger_entries ORDER BY entry_date DESC,created_at DESC LIMIT 120"),
  query<Legacy>("SELECT source_row,entry_date::text,description,money_in::text,money_out::text,recorded_balance::text,category FROM legacy_cash_entries ORDER BY source_row DESC LIMIT 120"),
  query<{opening_balance:string;new_in:string;new_out:string}>(
   "SELECT (SELECT recorded_balance::text FROM legacy_cash_entries WHERE recorded_balance IS NOT NULL ORDER BY source_row DESC LIMIT 1) opening_balance,(SELECT COALESCE(SUM(amount),0)::text FROM cash_ledger_entries WHERE direction='IN') new_in,(SELECT COALESCE(SUM(amount),0)::text FROM cash_ledger_entries WHERE direction='OUT') new_out")
 ]);
 const t=summary[0],nominal=Number(t.opening_balance||0)+Number(t.new_in)-Number(t.new_out);
 return <>
 <PageHead eyebrow="ADMIN / ARUS KAS" title="Buku Kas Kecil" description="Kas masuk, kas keluar, setoran, kasbon dan saldo. Catatan historis KELAPA GO dipisahkan dari transaksi operasional baru."/>
 <Notice success={p.success} error={p.error}/>
 <div className="metrics-grid">
  <section className="metric"><div className="metric-label">Saldo akhir historis (belum diaudit)</div><strong>{rupiah(t.opening_balance)}</strong></section>
  <section className="metric"><div className="metric-label">Kas masuk baru</div><strong>{rupiah(t.new_in)}</strong></section>
  <section className="metric"><div className="metric-label">Kas keluar baru</div><strong>{rupiah(t.new_out)}</strong></section>
  <section className="metric"><div className="metric-label">Proyeksi saldo berjalan*</div><strong>{rupiah(nominal)}</strong></section>
 </div>
 <Panel title="Catat Kas Kecil"><form action={newCashEntryAction} className="form-grid">
  <input name="requestKey" type="hidden" value={randomUUID()}/>
  <label>Tanggal<input name="date" type="date" defaultValue={today()} required/></label>
  <label>Jenis transaksi<select name="direction" defaultValue="OUT"><option value="OUT">Kas keluar</option><option value="IN">Kas masuk</option></select></label>
  <label>Kategori<select name="category" defaultValue="OPERASIONAL"><option value="OPERASIONAL">Operasional</option><option value="PEMBELIAN KELAPA">Pembelian kelapa</option><option value="SETORAN">Setoran</option><option value="TAMBAHAN DANA">Tambahan dana</option><option value="KASBON">Kasbon</option><option value="BBM/TRANSPORT">BBM / transport</option><option value="LAINNYA">Lainnya</option></select></label>
  <label>Jumlah (Rp)<input name="amount" type="number" min="0.01" step="0.01" required/></label>
  <label className="wide">Keterangan<input name="description" minLength={5} maxLength={400} required placeholder="Contoh: bensin pengantaran hari ini"/></label>
  <SubmitButton className="primary-button">Simpan Kas</SubmitButton>
 </form>
 <p className="form-hint">Penerimaan pembayaran tunai nota akan dicatat otomatis di buku kas. Jangan memasukkan pembayaran yang sama dua kali. Pembelian kelapa pada modul Pengadaan belum otomatis mencatat bukti pembayaran; gunakan kas keluar hanya bila benar dibayar tunai.</p></Panel>
 <Panel title="Transaksi kas baru"><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>
  {entries.map(x=><tr key={x.id}><td>{x.entry_date}</td><td>{x.direction==="IN"?"Masuk":"Keluar"}</td><td>{x.category}</td><td>{x.description}</td><td>{rupiah(x.amount)}</td></tr>)}</tbody></table></div></Panel>
 <Panel title="Riwayat Kas Kecil KELAPA GO" detail="Impor dari spreadsheet, tidak dihitung sebagai pengeluaran baru"><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Uraian</th><th>Kelompok</th><th>Masuk</th><th>Keluar</th><th>Saldo tertulis</th></tr></thead><tbody>
  {history.map(x=><tr key={x.source_row}><td>{x.entry_date||"—"}</td><td>{x.description}</td><td>{x.category||"—"}</td><td>{rupiah(x.money_in)}</td><td>{rupiah(x.money_out)}</td><td>{rupiah(x.recorded_balance??0)}</td></tr>)}</tbody></table></div>
  <p className="form-hint">*Saldo baru dihitung dari saldo tertulis terakhir pada spreadsheet ditambah perubahan kas baru. Sebelum diperlakukan sebagai uang fisik sebenarnya, Owner harus menghitung kas dan mencocokkan selisih.</p></Panel>
 </>;
}
