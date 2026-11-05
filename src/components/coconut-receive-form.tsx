"use client";
import {useMemo,useState} from "react";
import {receiveAction} from "@/app/(private)/coconut-actions";
import {SubmitButton} from "@/components/submit-button";
type Supplier={id:string;name:string;active:boolean};
type Grade={id:string;name:string};
type Price={supplier_id:string;grade_id:string;unit_price:string};
const rp=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function CoconutReceiveForm({suppliers,grades,prices,requestKey}:{suppliers:Supplier[];grades:Grade[];prices:Price[];requestKey:string}){
 const [supplierId,setSupplierId]=useState("");
 const [gradeId,setGradeId]=useState("");
 const [quantity,setQuantity]=useState(1);
 const [price,setPrice]=useState("");
 const last=useMemo(()=>prices.find(x=>x.supplier_id===supplierId&&x.grade_id===gradeId),[supplierId,gradeId,prices]);
 const change=(s:string,g:string)=>{setSupplierId(s);setGradeId(g);const previous=prices.find(x=>x.supplier_id===s&&x.grade_id===g);setPrice(previous?previous.unit_price:"");};
 const amount=Number(price)*quantity;
 const ready=!!supplierId&&!!gradeId&&Number.isSafeInteger(quantity)&&quantity>0&&price!==""&&Number.isFinite(amount)&&amount>=0;
 return <form action={receiveAction} className="form-grid">
  <input type="hidden" name="requestKey" value={requestKey}/>
  <label>Supplier<select name="supplierId" required value={supplierId} onChange={e=>change(e.target.value,gradeId)}>
   <option value="" disabled>Pilih supplier</option>{suppliers.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <label>Grade / jenis kelapa<select name="gradeId" required value={gradeId} onChange={e=>change(supplierId,e.target.value)}>
   <option value="" disabled>Pilih grade</option>{grades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
  <label>Jumlah diterima (butir)<input type="number" min="1" step="1" name="quantity" value={quantity} onChange={e=>setQuantity(Number(e.target.value))} required/></label>
  <label>Harga beli / butir (Rp)<input type="number" name="price" value={price} onChange={e=>setPrice(e.target.value)} min="0" step=".01" required/></label>
  <p className="form-hint wide">{last?"Harga otomatis diisi dari catatan terakhir; ubah bila harga disepakati berbeda.":"Belum ada harga tersimpan untuk kombinasi supplier dan grade. Masukkan harga aktual."}</p>
  <label className="wide">Keterangan (opsional)<input name="note" maxLength={400} placeholder="Misalnya nomor surat jalan"/></label>
  <div className="order-submit wide"><span><span className="small-muted">Total pembelian</span><strong>{rp(Number.isFinite(amount)?amount:0)}</strong></span><SubmitButton className="primary-button" disabled={!ready}>Simpan & Buat Batch</SubmitButton></div>
  <p className="form-hint wide">Satu input membuat satu batch otomatis. Setelah tersimpan, lanjutkan ke menu QC untuk pemeriksaan.</p>
 </form>;
}
