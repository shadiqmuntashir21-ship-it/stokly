"use client";
import {SubmitButton} from "@/components/submit-button";
import {useState} from "react";
import {createOrderAction} from "@/app/(private)/order-actions";
type Product={id:string;name:string;price:string;stock:number;unit:string};
type Outlet={id:string;name:string;active:boolean};
type Item={productId:string;quantity:number;unitPrice:number|null};
const rp=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function OrderComposer({products,outlets,requestKey,canOverride,numberReady}:{products:Product[];outlets:Outlet[];requestKey:string;canOverride:boolean;numberReady:boolean}){
 const [items,setItems]=useState<Item[]>([{productId:"",quantity:1,unitPrice:null}]);
 const [outlet,setOutlet]=useState("");
 const [reason,setReason]=useState("");
 const master=(id:string)=>Number(products.find(p=>p.id===id)?.price??0);
 const changed=items.some(x=>x.productId&&x.unitPrice!==null&&Math.round(x.unitPrice*100)!==Math.round(master(x.productId)*100));
 const valid=numberReady&&!!outlet&&items.length>0&&items.every(x=>x.productId&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&(x.unitPrice===null||Number.isFinite(x.unitPrice)&&x.unitPrice>=0))&&new Set(items.map(x=>x.productId)).size===items.length&&(!changed||canOverride&&reason.trim().length>=5);
 const total=items.reduce((s,x)=>s+(x.unitPrice??master(x.productId))*x.quantity,0);
 const update=(i:number,patch:Partial<Item>)=>setItems(old=>old.map((item,j)=>j===i?{...item,...patch}:item));
 return <form action={createOrderAction} className="order-compose">
 <input type="hidden" name="requestKey" value={requestKey}/>
 <input type="hidden" name="items" value={JSON.stringify(items)}/>
 {!numberReady&&<p className="form-hint" role="alert">Nomor kwitansi belum diaktifkan. Admin harus mencocokkan nomor terakhir di spreadsheet sebelum menerima order baru.</p>}
 <div className="form-grid">
  <label>Outlet<select name="outletId" required value={outlet} onChange={e=>setOutlet(e.target.value)}><option value="" disabled>Pilih outlet</option>{outlets.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  <label>Jadwal pengiriman<input name="deliveryDate" type="date"/></label>
  <label className="wide">Catatan order<input name="note" maxLength={400} placeholder="Instruksi outlet"/></label>
 </div>
 <div className="order-items">
  <div className="order-items-head"><strong>Produk dipesan</strong><button className="text-action" type="button" onClick={()=>setItems(old=>old.length<30?[...old,{productId:"",quantity:1,unitPrice:null}]:old)}>+ Tambah baris</button></div>
  {items.map((item,i)=><div className="order-item-row" key={i}>
   <label>Produk<select required value={item.productId} onChange={e=>update(i,{productId:e.target.value,unitPrice:null})}><option value="" disabled>Pilih produk</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {rp(Number(p.price))} / {p.unit}</option>)}</select></label>
   <label>Jumlah<input required min="1" step="1" type="number" value={item.quantity} onChange={e=>update(i,{quantity:Number(e.target.value)})}/></label>
   {canOverride&&<label>Harga transaksi (Rp)<input type="number" min="0" step="0.01" value={item.unitPrice??(item.productId?master(item.productId):"")} placeholder="Otomatis" onChange={e=>update(i,{unitPrice:e.target.value===""?null:Number(e.target.value)})}/></label>}
   <button type="button" className="remove-line" disabled={items.length===1} onClick={()=>setItems(old=>old.filter((_,j)=>j!==i))}>Hapus</button>
  </div>)}
 </div>
 {canOverride&&changed&&<label className="wide">Alasan harga khusus (wajib)<input name="priceReason" value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={400} required placeholder="Kesepakatan harga dengan outlet"/></label>}
 <div className="order-submit"><span><span className="small-muted">Total nilai order</span><strong>{rp(total)}</strong></span><SubmitButton className="primary-button" disabled={!valid}>Simpan Order & Nomor Kwitansi</SubmitButton></div>
 <p className="form-hint">Nomor kwitansi dibuat saat order berhasil disimpan. Stok baru berkurang setelah pengiriman dikonfirmasi.</p>
 </form>;
}
