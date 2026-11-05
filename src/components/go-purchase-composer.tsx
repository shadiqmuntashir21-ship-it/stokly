"use client";
import {useState} from "react";
import {combinedPurchaseAction} from "@/app/(private)/go-actions";
import {SubmitButton} from "@/components/submit-button";
type Grade={id:string;name:string;code:string};
type Supplier={id:string;name:string;active:boolean};
type LastPrice={supplier_id:string;grade_id:string;unit_price:string};
type Line={gradeId:string;quantity:number;unitPrice:number;passed:number;rejected:number};
export function GoPurchaseComposer({suppliers,grades,prices,requestKey,date}:{suppliers:Supplier[];grades:Grade[];prices:LastPrice[];requestKey:string;date:string}){
 const [supplier,setSupplier]=useState("");
 const [lines,setLines]=useState<Line[]>([{gradeId:"",quantity:1,unitPrice:0,passed:0,rejected:0}]);
 const update=(i:number,patch:Partial<Line>)=>setLines(a=>a.map((x,j)=>j===i?{...x,...patch}:x));
 const valid=supplier&&lines.length&&lines.every(x=>x.gradeId&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&x.unitPrice>0&&
 Number.isSafeInteger(x.passed)&&x.passed>=0&&Number.isSafeInteger(x.rejected)&&x.rejected>=0&&x.passed+x.rejected<=x.quantity)&&new Set(lines.map(x=>x.gradeId)).size===lines.length;
 const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
 return <form action={combinedPurchaseAction}>
  <input type="hidden" name="requestKey" value={requestKey}/>
  <input type="hidden" name="lines" value={JSON.stringify(lines)}/>
  <div className="form-grid">
   <label>Tanggal pembelian<input name="date" type="date" defaultValue={date} required/></label>
   <label>Supplier<select required name="supplierId" value={supplier} onChange={e=>{setSupplier(e.target.value);setLines(xs=>xs.map(x=>({...x,unitPrice:Number(prices.find(p=>p.supplier_id===e.target.value&&p.grade_id===x.gradeId)?.unit_price||0)})));}}>
    <option value="" disabled>Pilih supplier</option>{suppliers.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
   </select></label>
  </div>
  <div className="order-items">
   <div className="order-items-head"><strong>Jenis / grade pembelian, harga dan QC</strong><button className="text-action" type="button" onClick={()=>setLines(a=>a.length<15?[...a,{gradeId:"",quantity:1,unitPrice:0,passed:0,rejected:0}]:a)}>+ Grade lain</button></div>
   {lines.map((x,i)=><div key={i} className="order-item-row">
    <label>Grade beli<select required value={x.gradeId} onChange={e=>update(i,{gradeId:e.target.value,unitPrice:Number(prices.find(p=>p.supplier_id===supplier&&p.grade_id===e.target.value)?.unit_price||0)})}>
     <option value="" disabled>Pilih grade</option>{grades.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}
    </select></label>
    <label>Jumlah masuk<input required type="number" min="1" step="1" value={x.quantity} onChange={e=>update(i,{quantity:Number(e.target.value)})}/></label>
    <label>Harga beli / butir<input required type="number" min="0" step="0.01" value={x.unitPrice} onChange={e=>update(i,{unitPrice:Number(e.target.value)})}/></label>
    <label>Lolos QC<input type="number" min="0" max={x.quantity} step="1" value={x.passed} onChange={e=>update(i,{passed:Number(e.target.value)})}/></label>
    <label>Afkir QC<input type="number" min="0" max={x.quantity} step="1" value={x.rejected} onChange={e=>update(i,{rejected:Number(e.target.value)})}/></label>
    <button type="button" className="remove-line" disabled={lines.length===1} onClick={()=>setLines(a=>a.filter((_,j)=>j!==i))}>Hapus</button>
   </div>)}
  </div>
  <div className="form-grid"><label className="wide">Catatan / alasan afkir<input name="note" maxLength={400} placeholder="Contoh: sebagian masih perlu QC atau kondisi kelapa masuk"/></label></div>
  <div className="order-submit"><span><span className="small-muted">Total nilai pembelian</span><strong>{money(lines.reduce((s,x)=>s+x.quantity*x.unitPrice,0))}</strong></span>
   <SubmitButton className="primary-button" disabled={!valid}>Simpan Pembelian + QC</SubmitButton>
  </div>
  <p className="form-hint">QC boleh dicatat sebagian. Sisa masuk status belum QC dan dapat dilanjutkan di menu QC. Setiap grade mempunyai jumlah dan harga tersendiri.</p>
 </form>;
}
