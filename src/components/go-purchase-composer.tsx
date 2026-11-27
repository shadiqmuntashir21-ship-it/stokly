"use client";
import {useState} from "react";
import {paymentSplitValid} from "@/lib/purchase-payment-math";
import {combinedPurchaseAction} from "@/app/(private)/go-actions";
import {SubmitButton} from "@/components/submit-button";
type Grade={id:string;name:string;code:string};
type Supplier={id:string;name:string;active:boolean};
type LastPrice={supplier_id:string;grade_id:string;unit_price:string};
type Line={gradeId:string;quantity:number;unitPrice:number;passed:number;rejected:number};
export function GoPurchaseComposer({suppliers,grades,prices,requestKey,date}:{suppliers:Supplier[];grades:Grade[];prices:LastPrice[];requestKey:string;date:string}){
 const [supplier,setSupplier]=useState("");
 const [status,setStatus]=useState("");
 const [wallet,setWallet]=useState("SMALL");
 const [partial,setPartial]=useState(0);
 const [split,setSplit]=useState(0);
 const [lines,setLines]=useState<Line[]>([{gradeId:"",quantity:1,unitPrice:0,passed:0,rejected:0}]);
 const addLine=()=>setLines(a=>a.length<Math.min(15,grades.length)?[...a,{gradeId:"",quantity:1,unitPrice:0,passed:0,rejected:0}]:a);
 const update=(i:number,patch:Partial<Line>)=>setLines(a=>a.map((x,j)=>j===i?{...x,...patch}:x));
 const valid=supplier&&lines.length&&lines.every(x=>x.gradeId&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&x.unitPrice>0&&
 Number.isSafeInteger(x.passed)&&x.passed>=0&&Number.isSafeInteger(x.rejected)&&x.rejected>=0&&x.passed+x.rejected<=x.quantity)&&new Set(lines.map(x=>x.gradeId)).size===lines.length;
 const total=lines.reduce((s,x)=>s+Math.round(x.unitPrice*100)*x.quantity,0)/100;
 const paid=status==="paid"?total:status==="partial"?partial:0;
 const small=status==="unpaid"?0:wallet==="SMALL"?paid:wallet==="BOTH"?split:0;
 const large=status==="unpaid"?0:wallet==="LARGE"?paid:wallet==="BOTH"?Math.round((paid-split)*100)/100:0;
 const paymentValid=paymentSplitValid(status,total,small,large);
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
   <div className="order-items-head"><strong>Rincian grade kelapa ({lines.length})</strong></div><p className="form-hint">Pilih supplier satu kali. Masukkan semua grade yang dibawa supplier, dengan jumlah dan harga per butir masing-masing.</p>
   {lines.map((x,i)=><div key={i} className="order-item-row">
    <label>Grade {i+1}<select required value={x.gradeId} onChange={e=>update(i,{gradeId:e.target.value,unitPrice:Number(prices.find(p=>p.supplier_id===supplier&&p.grade_id===e.target.value)?.unit_price||0)})}>
     <option value="" disabled>Pilih grade</option>{grades.map(g=><option value={g.id} key={g.id} disabled={lines.some((line,j)=>j!==i&&line.gradeId===g.id)}>{g.name}</option>)}
    </select></label>
    <label>Jumlah masuk<input required type="number" min="1" step="1" value={x.quantity} onChange={e=>update(i,{quantity:Number(e.target.value)})}/></label>
    <label>Harga beli / butir (Rp)<input required type="number" min="0.01" step="0.01" value={x.unitPrice} onChange={e=>update(i,{unitPrice:Number(e.target.value)})}/></label>
    <label>Lolos QC<input type="number" min="0" max={x.quantity} step="1" value={x.passed} onChange={e=>update(i,{passed:Number(e.target.value)})}/></label>
    <label>Afkir QC<input type="number" min="0" max={x.quantity} step="1" value={x.rejected} onChange={e=>update(i,{rejected:Number(e.target.value)})}/></label>
    <p className="form-hint">Subtotal grade: <strong>{money(Math.round(x.unitPrice*100)*x.quantity/100)}</strong></p><button type="button" className="remove-line" disabled={lines.length===1} onClick={()=>setLines(a=>a.filter((_,j)=>j!==i))}>Hapus</button>
   </div>)}
   <button className="primary-button" type="button" onClick={addLine} disabled={lines.length>=Math.min(15,grades.length)}>+ Tambah Grade Kelapa</button>
   <p className="form-hint">Total kelapa: <strong>{lines.reduce((n,x)=>n+x.quantity,0).toLocaleString("id-ID")} butir</strong> · {lines.length} rincian grade · {money(total)}</p>
  </div>
  <div className="form-grid"><label className="wide">Catatan / alasan afkir<input name="note" maxLength={400} placeholder="Contoh: sebagian masih perlu QC atau kondisi kelapa masuk"/></label></div>
  <div className="form-grid"><label>Status pembayaran<select name="paymentStatus" value={status} onChange={e=>setStatus(e.target.value)} required><option value="" disabled>Pilih status pembayaran</option><option value="paid">Lunas</option><option value="partial">Dibayar sebagian</option><option value="unpaid">Belum dibayar (utang supplier)</option></select></label>
  {status==="partial"&&<label>Jumlah dibayar (Rp)<input type="number" min="0.01" step=".01" max={total} value={partial} onChange={e=>setPartial(Number(e.target.value))} required/></label>}
  {status&&status!=="unpaid"&&<><label>Sumber dana<select value={wallet} onChange={e=>setWallet(e.target.value)}><option value="SMALL">Kas Kecil</option><option value="LARGE">Kas Besar</option><option value="BOTH">Kombinasi kedua kas</option></select></label>{wallet==="BOTH"&&<label>Bagian Kas Kecil (Rp)<input type="number" min="0.01" step=".01" max={paid} value={split} onChange={e=>setSplit(Number(e.target.value))} required/></label>}</>}
  <input type="hidden" name="smallPayment" value={small}/><input type="hidden" name="largePayment" value={large}/>
  <p className="form-hint wide">Kas Kecil: {money(small)} · Kas Besar: {money(large)} · Sisa utang: {money(Math.max(0,total-paid))}. Jangan input ulang di buku kas. Pembayaran memerlukan saldo awal kas terverifikasi.</p></div>
  <div className="order-submit"><span><span className="small-muted">Total nilai pembelian</span><strong>{money(total)}</strong></span>
   <SubmitButton className="primary-button" disabled={!valid||!paymentValid}>Simpan Pembelian + QC</SubmitButton>
  </div>
  <p className="form-hint">QC boleh dicatat sebagian. Sisa masuk status belum QC dan dapat dilanjutkan di menu QC. Setiap grade mempunyai jumlah dan harga tersendiri.</p>
 </form>;
}
