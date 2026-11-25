import {SubmitButton} from "@/components/submit-button";
import {cashCorrectionAction} from "./correction-actions";
type Entry={id:string;entry_date:string;category:string;description:string;amount:string;reference_type:string|null;asset_name:string|null;asset_quantity:number|null;asset_vendor:string|null;asset_note:string|null};
export function CashCorrection({entry:e}:{entry:Entry}){
 const asset=e.reference_type==="asset_purchase",wallet=e.category.startsWith("KAS BESAR:")?"LARGE":"SMALL",category=e.category.replace(/^KAS BESAR: /,"");
 const categories=["OPERASIONAL","PEMBELIAN KELAPA","SETORAN","TAMBAHAN DANA","KASBON","BBM/TRANSPORT","LAINNYA"];
 return <details className="edit-detail"><summary>Edit / Batalkan transaksi</summary><form className="form-grid" action={cashCorrectionAction}>
 <input name="id" value={e.id} type="hidden"/>
 <label>Tanggal<input name="date" type="date" defaultValue={e.entry_date} required/></label>
 <label>Sumber dana<select name="wallet" defaultValue={wallet}><option value="SMALL">Kas Kecil</option><option value="LARGE">Kas Besar</option></select></label>
 {asset?<><input name="category" value="ASET" type="hidden"/><label>Nama aset<input name="assetName" defaultValue={e.asset_name||""} maxLength={150} required/></label><label>Jumlah aset<input name="assetQuantity" type="number" min="1" step="1" defaultValue={e.asset_quantity??1} required/></label><label>Vendor<input name="assetVendor" defaultValue={e.asset_vendor||""} maxLength={200}/></label></>:<label>Kategori<select name="category" defaultValue={categories.includes(category)?category:"LAINNYA"}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
 <label>Nominal total (Rp)<input name="amount" type="number" min="0.01" step=".01" defaultValue={e.amount} required/></label>
 <label>Keterangan<input name="description" defaultValue={asset?e.asset_note||e.description:e.description} minLength={5} maxLength={400} required/></label>
 <label className="wide">Alasan koreksi<input name="reason" minLength={5} maxLength={400} required/></label>
 <label>Tindakan<select name="mode"><option value="edit">Edit</option><option value="void">Batalkan</option></select></label>
 <label className="wide"><input type="checkbox" name="confirm" value="1" required/> Saya sudah memeriksa bukti dan dampak saldo.</label>
 <SubmitButton className="primary-button">Simpan koreksi</SubmitButton></form></details>;
}
