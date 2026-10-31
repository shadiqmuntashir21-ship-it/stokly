"use client";
import {useState} from "react";
import { createOrderAction } from "@/app/(private)/order-actions";

type Product={id:string;name:string;price:string;stock:number;unit:string};
type Outlet={id:string;name:string;active:boolean};
const formatter=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
export function OrderComposer({products,outlets,requestKey}:{products:Product[];outlets:Outlet[];requestKey:string}){
 const [items,setItems]=useState<{productId:string;quantity:number}[]>([{productId:"",quantity:1}]);
 const [outlet,setOutlet]=useState("");
 const total=items.reduce((sum,x)=>sum+(Number(products.find(p=>p.id===x.productId)?.price||0)*(x.quantity||0)),0);
 const valid=!!outlet && items.length>0 && items.every(i=>i.productId&&i.quantity>0&&Number.isSafeInteger(i.quantity)) &&
 new Set(items.map(x=>x.productId)).size===items.length;
 const update=(index:number,field:"productId"|"quantity",value:string)=>{
   setItems(prev=>prev.map((x,i)=>i===index?{...x,[field]:field==="quantity"?Number(value):value}:x));
 };
 return <form action={createOrderAction} className="order-compose">
  <input name="requestKey" type="hidden" value={requestKey}/>
  <input name="items" type="hidden" value={JSON.stringify(items)}/>
  <div className="form-grid">
   <label>Outlet<select name="outletId" required value={outlet} onChange={e=>setOutlet(e.target.value)}>
    <option value="" disabled>Pilih outlet</option>{outlets.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
   </select></label>
   <label>Jadwal pengiriman<input name="deliveryDate" type="date"/></label>
   <label className="wide">Catatan order<input name="note" maxLength={400} placeholder="Permintaan outlet dan instruksi lain"/></label>
  </div>
  <div className="order-items">
   <div className="order-items-head"><strong>Produk yang dipesan</strong><button className="text-action" type="button" onClick={()=>setItems(x=>x.length<30?[...x,{productId:"",quantity:1}]:x)}>+ Tambah baris</button></div>
   {items.map((item,index)=><div className="order-item-row" key={index}>
    <label>Produk<select required value={item.productId} onChange={e=>update(index,"productId",e.target.value)}>
      <option value="" disabled>Pilih produk</option>
      {products.map(p=><option key={p.id} value={p.id}>{p.name} · {formatter(Number(p.price))} / {p.unit}</option>)}
    </select></label>
    <label>Jumlah<input required min="1" step="1" type="number" value={item.quantity} onChange={e=>update(index,"quantity",e.target.value)}/></label>
    <button className="remove-line" type="button" aria-label="Hapus baris" disabled={items.length===1} onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==index))}>Hapus</button>
   </div>)}
  </div>
  <div className="order-submit"><span><span className="small-muted">Total order (harga tersimpan saat konfirmasi)</span><strong>{formatter(total)}</strong></span>
   <button className="primary-button" disabled={!valid}>Konfirmasi Order</button>
  </div>
  <p className="form-hint">Order belum langsung mengurangi stok. Stok berkurang ketika barang dicatat terkirim. Pastikan harga produk sudah benar.</p>
 </form>;
}
