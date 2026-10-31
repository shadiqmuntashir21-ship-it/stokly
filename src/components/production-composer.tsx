"use client";
import {SubmitButton} from "@/components/submit-button";
import {useState} from "react";
import {productionAction} from "@/app/(private)/coconut-actions";
type Batch={batch_id:string;supplier:string;grade:string;accepted_qty:number;consumed_qty:number};
type Product={id:string;name:string;unit:string};
export function ProductionComposer({batches,products,requestKey,date}:{batches:Batch[];products:Product[];requestKey:string;date:string}){
 const [outputs,setOutputs]=useState<{productId:string;quantity:number}[]>([{productId:"",quantity:1}]);
 const valid=outputs.every(x=>x.productId&&Number.isSafeInteger(x.quantity)&&x.quantity>0)&&
  new Set(outputs.map(x=>x.productId)).size===outputs.length;
 return <form action={productionAction}>
  <input type="hidden" name="requestKey" value={requestKey}/>
  <input type="hidden" name="outputs" value={JSON.stringify(outputs)}/>
  <div className="form-grid">
   <label>Tanggal produksi<input name="date" type="date" defaultValue={date} required/></label>
   <label className="wide">Batch bahan baku<select name="batchId" defaultValue="" required>
    <option value="" disabled>Pilih batch</option>{batches.map(b=><option key={b.batch_id} value={b.batch_id}>
      {b.supplier} — {b.grade} — siap {b.accepted_qty-b.consumed_qty} butir</option>)}</select></label>
   <label>Kelapa digunakan (butir)<input name="used" type="number" min="1" step="1" required/></label>
   <label>Jumlah dikupas (butir)<input name="peeled" type="number" min="0" step="1" required/></label>
   <label className="wide">Catatan<input name="note" maxLength={400} placeholder="Penyusutan / catatan produksi"/></label>
  </div>
  <div className="order-items">
   <div className="order-items-head"><strong>Hasil produk jadi</strong>
     <button className="text-action" type="button" onClick={()=>setOutputs(prev=>prev.length<20?[...prev,{productId:"",quantity:1}]:prev)}>+ Tambah produk</button></div>
   {outputs.map((o,index)=><div className="order-item-row" key={index}>
     <label>Produk<select required value={o.productId} onChange={e=>setOutputs(prev=>prev.map((v,i)=>i===index?{...v,productId:e.target.value}:v))}>
       <option value="" disabled>Pilih produk jadi</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select></label>
     <label>Jumlah<input type="number" min="1" step="1" required value={o.quantity}
       onChange={e=>setOutputs(prev=>prev.map((v,i)=>i===index?{...v,quantity:Number(e.target.value)}:v))}/></label>
     <button className="remove-line" disabled={outputs.length===1} type="button" onClick={()=>setOutputs(prev=>prev.filter((_,i)=>i!==index))}>Hapus</button>
    </div>)}
  </div>
  <div className="order-submit"><p className="small-muted">Bahan baku dikurangi sekali. Semua hasil produk ditambahkan dalam transaksi yang sama.</p>
   <SubmitButton className="primary-button" disabled={!valid||!products.length||!batches.length}>Simpan Produksi</SubmitButton></div>
 </form>;
}
