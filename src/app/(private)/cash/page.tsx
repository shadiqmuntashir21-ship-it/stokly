import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {RupiahField} from "@/components/rupiah-field";
import {newCashEntryAction,openingCashAction} from "../go-actions";
import {walletBalances} from "@/lib/operational-cash";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Entry={id:string;entry_date:string;direction:string;category:string;description:string;amount:string};
type Legacy={source_row:number;entry_date:string|null;description:string;money_in:string;money_out:string;recorded_balance:string|null;category:string|null};
export default async function Cash({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 const actor=await requireActor(["owner","admin"]);
 const [p,entries,history,wallets,archive]=await Promise.all([
  searchParams,
  query<Entry>("SELECT id::text,entry_date::text,direction,category,description,amount::text FROM cash_ledger_entries ORDER BY entry_date DESC,created_at DESC LIMIT 120"),
  query<Legacy>("SELECT source_row,entry_date::text,description,money_in::text,money_out::text,recorded_balance::text,category FROM legacy_cash_entries ORDER BY source_row DESC LIMIT 120"),
  walletBalances(),
  query<{last_balance:string|null;pending:number}>("SELECT (SELECT recorded_balance::text FROM legacy_cash_entries WHERE recorded_balance IS NOT NULL ORDER BY source_row DESC LIMIT 1) last_balance,(SELECT COUNT(*)::int FROM legacy_source_rows s WHERE s.source_sheet='KAS KECIL' AND s.source_row BETWEEN 1388 AND 1428 AND NOT EXISTS(SELECT 1 FROM legacy_cash_entries e WHERE e.source_row=s.source_row)) pending")
 ]);
 return <>
 <PageHead eyebrow="ADMIN / ARUS KAS" title="Kas Kecil & Kas Besar" description="Saldo operasional dihitung dari saldo awal terverifikasi dan transaksi STOKLY baru. Arsip KELAPA GO terpisah."/>
 <Notice success={p.success} error={p.error}/>
 <Panel title="Kas operasional STOKLY" detail="Saldo awal tidak diambil dari Excel">
  <div className="metrics-grid">{wallets.map(w=><section key={w.wallet} className="metric"><div className="metric-label">{w.wallet==="SMALL"?"Kas Kecil":"Kas Besar"}</div><strong>{w.balance===null?"Belum ditetapkan":rupiah(w.balance)}</strong><div className="form-hint">Saldo awal: {w.opening===null?"Perlu konfirmasi Owner":rupiah(w.opening)}<br/>Masuk: {rupiah(w.incoming)}<br/>Keluar: {rupiah(w.outgoing)}<br/>Mutasi bersih: {rupiah(Number(w.incoming)-Number(w.outgoing))}</div></section>)}</div>
  {actor.role==="owner"&&wallets.filter(w=>w.opening===null).map(w=><form key={w.wallet} action={openingCashAction} className="form-grid">
   <input type="hidden" name="wallet" value={w.wallet}/>
   <RupiahField name="amount" label={"Tetapkan saldo awal "+(w.wallet==="SMALL"?"Kas Kecil":"Kas Besar")+" (Rp)"} allowZero requireEntry/>
   <label>Keterangan sumber saldo<input name="reason" required minLength={5} maxLength={400} placeholder="Hasil hitung tunai / saldo rekening sebelum transaksi STOKLY"/></label>
   <p className="form-hint wide">Isi saldo sebelum transaksi operasional pertama; ketik 0 jika memang nol. Hanya dapat ditetapkan sekali. Tidak dianggap pendapatan.</p>
   <SubmitButton className="primary-button">Tetapkan saldo awal</SubmitButton>
  </form>)}
  <p className="form-hint">CASH masuk Kas Kecil, TF masuk Kas Besar. Jika saldo awal belum ditetapkan, hanya mutasi bersih yang pasti; jangan anggap sebagai saldo fisik.</p>
 </Panel>
 <Panel title="Catat kas masuk / keluar"><form action={newCashEntryAction} className="form-grid">
  <input name="requestKey" type="hidden" value={randomUUID()}/>
  <label>Tanggal<input name="date" type="date" defaultValue={today()} required/></label>
  <label>Sumber uang<select name="wallet" defaultValue="SMALL"><option value="SMALL">Kas Kecil</option><option value="LARGE">Kas Besar</option></select></label>
  <label>Jenis transaksi<select name="direction" defaultValue="OUT"><option value="OUT">Kas keluar</option><option value="IN">Kas masuk</option></select></label>
  <label>Kategori<select name="category" defaultValue="OPERASIONAL"><option value="OPERASIONAL">Operasional</option><option value="PEMBELIAN KELAPA">Pembelian kelapa</option><option value="SETORAN">Setoran</option><option value="TAMBAHAN DANA">Tambahan dana</option><option value="KASBON">Kasbon</option><option value="BBM/TRANSPORT">BBM / transport</option><option value="LAINNYA">Lainnya</option></select></label>
  <RupiahField name="amount" label="Jumlah (Rp)"/>
  <label className="wide">Keterangan<input name="description" minLength={5} maxLength={400} required placeholder="Contoh: bensin pengantaran hari ini"/></label>
  <SubmitButton className="primary-button">Simpan Kas</SubmitButton>
 </form>
 <p className="form-hint">Penerimaan pembayaran tunai nota akan dicatat otomatis di buku kas. Jangan memasukkan pembayaran yang sama dua kali. Pembelian kelapa pada modul Pengadaan belum otomatis mencatat bukti pembayaran; gunakan kas keluar hanya bila benar dibayar tunai.</p></Panel>
 <Panel title="Transaksi kas baru"><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Sumber Kas</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>
  {entries.map(x=><tr key={x.id}><td>{x.entry_date}</td><td>{x.direction==="IN"?"Masuk":"Keluar"}</td><td>{x.category.startsWith("KAS BESAR:")||x.category==="PENJUALAN TRANSFER"?"Kas Besar":"Kas Kecil"}</td><td>{x.category.replace(/^KAS BESAR: /,"")}</td><td>{x.description}</td><td>{rupiah(x.amount)}</td></tr>)}</tbody></table></div></Panel>
 <Panel title="Arsip Kas Kecil KELAPA GO" detail="Referensi historis saja — tidak masuk saldo operasional"><p className="form-hint">Saldo historis tertulis: {archive[0]?.last_balance==null?"—":rupiah(archive[0].last_balance)} (belum terverifikasi). {archive[0]?.pending||0} baris kas masih menunggu rekonsiliasi.</p><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Uraian</th><th>Kelompok</th><th>Masuk</th><th>Keluar</th><th>Saldo tertulis</th></tr></thead><tbody>
  {history.map(x=><tr key={x.source_row}><td>{x.entry_date||"—"}</td><td>{x.description}</td><td>{x.category||"—"}</td><td>{rupiah(x.money_in)}</td><td>{rupiah(x.money_out)}</td><td>{x.recorded_balance===null?"Belum terverifikasi":rupiah(x.recorded_balance)}</td></tr>)}</tbody></table></div>
  <p className="form-hint">Arsip Excel tidak memengaruhi saldo Kas Kecil ataupun Kas Besar operasional. Rekonsiliasi arsip tetap dilakukan terpisah.</p></Panel>
 </>;
}
