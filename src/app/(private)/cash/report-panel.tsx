import {Panel,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {RupiahField} from "@/components/rupiah-field";
import type {CashReport} from "@/lib/cash-report";
import {saveDailyBudgetAction} from "./budget-actions";
export function CashReportPanel({report,canBudget}:{report:CashReport;canBudget:boolean}){
 const {from,to,totals,budgets,rows}=report;
 const url="/api/cash/report?from="+encodeURIComponent(from)+"&to="+encodeURIComponent(to);
 return <Panel title="Laporan kas harian & anggaran" detail="Laporan operasional baru, arsip historis tidak digandakan">
 <form method="get" className="form-grid"><label>Dari<input name="from" type="date" defaultValue={from} required/></label><label>Sampai<input name="to" type="date" defaultValue={to} required/></label><button className="primary-button" type="submit">Tampilkan</button></form>
 <div style={{padding:16,display:"flex",gap:12,flexWrap:"wrap"}}><a className="primary-button" href={url+"&format=xlsx"}>Unduh Excel</a><a className="primary-button" href={url+"&format=pdf"}>Unduh PDF</a></div>
 <div className="table-wrap"><table><thead><tr><th>Sumber kas</th><th>Saldo awal periode</th><th>Masuk</th><th>Keluar</th><th>Operasional</th><th>Aset</th><th>Saldo akhir</th></tr></thead><tbody>{totals.map(x=><tr key={x.wallet}><td>{x.wallet==="SMALL"?"Kas Kecil":"Kas Besar"}</td><td>{x.opening===null?"Belum ditetapkan":rupiah(x.opening)}</td><td>{rupiah(x.incoming)}</td><td>{rupiah(x.outgoing)}</td><td>{rupiah(x.operational)}</td><td>{rupiah(x.assets)}</td><td>{x.closing===null?"Belum ditetapkan":rupiah(x.closing)}</td></tr>)}</tbody></table></div>
 {canBudget&&<form action={saveDailyBudgetAction} className="form-grid"><label>Tanggal budget<input name="date" type="date" defaultValue={to} required/></label><RupiahField name="amount" label="Anggaran operasional harian Kas Kecil" allowZero requireEntry/><label className="wide">Alasan penetapan / perubahan<input name="reason" required minLength={5} maxLength={400}/></label><SubmitButton className="primary-button">Simpan Budget Harian</SubmitButton></form>}
 <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Budget Kas Kecil</th><th>Operasional terpakai</th><th>Sisa anggaran</th></tr></thead><tbody>{budgets.map(b=><tr key={b.date}><td>{b.date}</td><td>{b.budget===null?"Belum ditetapkan":rupiah(b.budget)}</td><td>{rupiah(b.spent)}</td><td>{b.budget===null?"—":rupiah(Number(b.budget)-Number(b.spent))}</td></tr>)}</tbody></table></div>
 <p className="form-hint">Budget hanya menghitung kategori Operasional dan BBM/Transport dari Kas Kecil. Pembelian aset mengurangi saldo sumber kas, bukan budget operasional. {rows.length} transaksi pada periode ini.</p>
 </Panel>;
}
