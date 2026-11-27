"use client";
import {useActionState,useState} from "react";
import {paymentSplitValid,purchaseFundingError,type CashAvailability} from "@/lib/purchase-payment-math";
import {combinedPurchaseAction} from "@/app/(private)/go-actions";
import {SubmitButton} from "@/components/submit-button";
type Grade={id:string;name:string;code:string};
type Supplier={id:string;name:string;active:boolean};
type LastPrice={supplier_id:string;grade_id:string;unit_price:string};
type Line={gradeId:string;quantity:number;unitPrice:number;passed:number;rejected:number};
export function GoPurchaseComposer({suppliers,grades,prices,requestKey,date,available,isOwner}:{suppliers:Supplier[];grades:Grade[];prices:LastPrice[];requestKey:string;date:string;available:CashAvailability;isOwner:boolean}){
 const [supplier,setSupplier]=useState("");
 const canUse=(wallet:keyof CashAvailability)=>available[wallet]!==null&&Number(available[wallet])>0;
 const canPay=canUse("SMALL")||canUse("LARGE");
 const [status,setStatus]=useState(canPay?"":"unpaid");
 const [purchaseDate,setPurchaseDate]=useState(date);
 const [note,setNote]=useState("");
 const [result,formAction,pending]=useActionState(combinedPurchaseAction,{error:""});
 const [wallet,setWallet]=useState(canUse("SMALL")?"SMALL":canUse("LARGE")?"LARGE":"SMALL");
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
 const fundingError=purchaseFundingError(available,small,large);
 const paymentValid=paymentSplitValid(status,total,small,large)&&!fundingError;
 const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
 return <form action={formAction}>
  <input type="hidden" name="requestKey" value={requestKey}/>
  <input type="hidden" name="lines" value={JSON.stringify(lines)}/>
  <div className="form-grid">
   <label>Tanggal pembelian<input name="date" type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} required/></label>
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
  <div className="form-grid"><label className="wide">Catatan / alasan afkir<input name="note" value={note} onChange={e=>setNote(e.target.value)} maxLength={400} placeholder="Contoh: sebagian masih perlu QC atau kondisi kelapa masuk"/></label></div>
  <div className="metrics-grid">{(["SMALL","LARGE"] as const).map(w=><section className="metric" key={w}><div className="metric-label">{w==="SMALL"?"Kas Kecil":"Kas Besar"} · saldo tersedia</div><strong>{available[w]===null?"Belum ditetapkan":money(available[w]!)}</strong></section>)}</div>
  {(!canUse("SMALL")||!canUse("LARGE"))&&<p className="form-hint">{!canPay?"Belum ada kas yang dapat digunakan. Pembelian dan QC tetap bisa disimpan sebagai utang supplier. ":"Gunakan kas dengan saldo mencukupi, atau simpan sebagai utang supplier. "}{isOwner?<a href="/cash" target="_blank" rel="noopener noreferrer">Kelola saldo awal kas (tab baru)</a>:"Hubungi Owner untuk menetapkan saldo awal atau menambah dana."}</p>}
  <div className="form-grid"><label>Status pembayaran<select name="paymentStatus" value={status} onChange={e=>setStatus(e.target.value)} required><option value="" disabled>Pilih status pembayaran</option><option value="paid" disabled={!canPay}>Lunas</option><option value="partial" disabled={!canPay}>Dibayar sebagian</option><option value="unpaid">Belum dibayar (utang supplier)</option></select></label>
  {status==="partial"&&<label>Jumlah dibayar (Rp)<input type="number" min="0.01" step=".01" max={total} value={partial} onChange={e=>setPartial(Number(e.target.value))} required/></label>}
  {status&&status!=="unpaid"&&<><label>Sumber dana<select value={wallet} onChange={e=>setWallet(e.target.value)}><option value="SMALL" disabled={!canUse("SMALL")}>Kas Kecil</option><option value="LARGE" disabled={!canUse("LARGE")}>Kas Besar</option><option value="BOTH" disabled={!canUse("SMALL")||!canUse("LARGE")}>Kombinasi kedua kas</option></select></label>{wallet==="BOTH"&&<label>Bagian Kas Kecil (Rp)<input type="number" min="0.01" step=".01" max={paid} value={split} onChange={e=>setSplit(Number(e.target.value))} required/></label>}</>}
  <input type="hidden" name="smallPayment" value={small}/><input type="hidden" name="largePayment" value={large}/>
  <p className="form-hint wide">Kas Kecil: {money(small)} · Kas Besar: {money(large)} · Sisa utang: {money(Math.max(0,total-paid))}. Jangan input ulang di buku kas. Pembayaran memerlukan saldo awal kas terverifikasi.</p></div>
  {result.error&&<p className="error-notice" role="alert">{result.error} Isian pembelian tetap tersedia; periksa dan coba lagi.</p>}
  {fundingError&&<p className="error-notice" role="alert">{fundingError} Ubah sumber dana/nominal atau pilih simpan sebagai utang jika memang belum dibayar.</p>}
  {status!=="unpaid"&&(fundingError||result.error)&&<button className="primary-button" type="button" disabled={pending} onClick={()=>setStatus("unpaid")}>Ubah menjadi Belum Dibayar</button>}
  {status==="unpaid"&&<p className="form-hint">Tidak ada kas keluar saat penyimpanan. Bayar kemudian melalui Utang & pembayaran supplier setelah dana tersedia.</p>}
  <div className="order-submit"><span><span className="small-muted">Total nilai pembelian</span><strong>{money(total)}</strong></span>
   <SubmitButton className="primary-button" disabled={pending||!valid||!paymentValid}>{status==="unpaid"?"Simpan Pembelian + QC sebagai Utang":"Simpan Pembelian + QC"}</SubmitButton>
  </div>
  <p className="form-hint">QC boleh dicatat sebagian. Sisa masuk status belum QC dan dapat dilanjutkan di menu QC. Setiap grade mempunyai jumlah dan harga tersendiri.</p>
 </form>;
}
