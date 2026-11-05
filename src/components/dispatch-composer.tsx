"use client";
import {useState} from "react";
import {dispatchAction} from "@/app/(private)/order-actions";
import {SubmitButton} from "@/components/submit-button";
type Line={id:string;order_id:string;number:string|null;outlet:string;product:string;quantity:number;shipped:number;unit_price:string};
const localDate=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function DispatchComposer({lines,requestKey,initialOrderId=""}:{lines:Line[];requestKey:string;initialOrderId?:string}){
 const open=lines.filter(x=>x.quantity>x.shipped);
 const orders=Array.from(new Map(open.map(x=>[x.order_id,{id:x.order_id,number:x.number,outlet:x.outlet}])).values());
 const [orderId,setOrderId]=useState(initialOrderId);
 const selected=open.filter(x=>x.order_id===orderId);
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const items=selected.filter(x=>(quantities[x.id]??(x.quantity-x.shipped))>0).map(x=>({orderItemId:x.id,quantity:quantities[x.id]??(x.quantity-x.shipped)}));
 const valid=items.length>0&&items.every(x=>Number.isSafeInteger(x.quantity)&&x.quantity<=selected.find(y=>y.id===x.orderItemId)!.quantity-selected.find(y=>y.id===x.orderItemId)!.shipped);
 return <form action={dispatchAction} className="form-grid">
  <input name="requestKey" type="hidden" value={requestKey}/><input name="orderId" type="hidden" value={orderId}/><input name="items" type="hidden" value={JSON.stringify(items)}/>
  <label className="wide">Order / Kwitansi<select value={orderId} onChange={e=>{setOrderId(e.target.value);setQuantities({});}} required><option value="" disabled>Pilih order yang belum selesai dikirim</option>{orders.map(x=><option key={x.id} value={x.id}>{x.number||"Nomor lama belum disesuaikan"} · {x.outlet}</option>)}</select></label>
  {selected.map(x=><label key={x.id}>{x.product} · sisa {x.quantity-x.shipped}<input type="number" min="0" max={x.quantity-x.shipped} step="1" value={quantities[x.id]??(x.quantity-x.shipped)} onChange={e=>setQuantities(old=>({...old,[x.id]:Number(e.target.value)}))}/></label>)}
  {selected.length>0&&<div className="wide" style={{display:"flex",gap:12,flexWrap:"wrap"}}><button type="button" className="text-action" onClick={()=>setQuantities(Object.fromEntries(selected.map(x=>[x.id,x.quantity-x.shipped])))}>Kirim semua</button><button type="button" className="text-action" onClick={()=>setQuantities(Object.fromEntries(selected.map(x=>[x.id,0])))}>Isi sebagian</button></div>}
  <label>Tanggal kirim<input type="date" name="deliveredOn" defaultValue={localDate()} required/></label>
  <label className="wide">Catatan / kurir<input name="note" maxLength={400} placeholder="Petugas, kendaraan dan bukti pengiriman"/></label>
  <SubmitButton className="primary-button" disabled={!valid}>Konfirmasi Pengiriman & Tagihan</SubmitButton>
  <p className="form-hint wide">Satu pengiriman boleh memuat beberapa produk dari order yang sama. Stok dan tagihan diperbarui bersama dalam satu transaksi.</p>
 </form>;
}
