"use client";
import {SubmitButton} from "@/components/submit-button";
import {useState} from "react";
import {SearchableChoice} from "@/components/searchable-choice";
import {rupiahDigits,groupedRupiah,nominalLabel} from "@/lib/rupiah-input";
import {createOrderAction} from "@/app/(private)/order-actions";
type Product={id:string;name:string;price:string;stock:number;unit:string};
type Outlet={id:string;name:string;active:boolean};
type Item={productId:string;quantity:number;unitPrice:number|null};
const rp=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function OrderComposer({products,outlets,requestKey,canOverride,numberReady,initialOutlet="",initialItems=[]}:{products:Product[];outlets:Outlet[];requestKey:string;canOverride:boolean;numberReady:boolean;initialOutlet?:string;initialItems?:Item[]}){
 const [items,setItems]=useState<Item[]>(initialItems.length?initialItems:[{productId:"",quantity:1,unitPrice:null}]);
 const [outlet,setOutlet]=useState(initialOutlet);
 const outletChoices=outlets.filter(x=>x.active).map(x=>({id:x.id,label:x.name}));
 const [reason,setReason]=useState("");
 const master=(id:string)=>Number(products.find(p=>p.id===id)?.price??0);
 const changed=items.some(x=>x.productId&&x.unitPrice!==null&&Math.round(x.unitPrice*100)!==Math.round(master(x.productId)*100));
 const valid=!!outlet&&items.length>0&&items.every(x=>x.productId&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&Number.isFinite(x.unitPrice??master(x.productId))&&(x.unitPrice??master(x.productId))>0)&&new Set(items.map(x=>x.productId)).size===items.length&&(!changed||canOverride&&reason.trim().length>=5)&&numberReady;
 const total=items.reduce((s,x)=>s+(x.unitPrice??master(x.productId))*x.quantity,0);
 const update=(i:number,patch:Partial<Item>)=>setItems(old=>old.map((item,j)=>j===i?{...item,...patch}:item));
 return <form action={createOrderAction} className="order-compose">
 <input type="hidden" name="requestKey" value={requestKey}/>
 <input type="hidden" name="items" value={JSON.stringify(items)}/>
 <input type="hidden" name="outletId" value={outlet}/>
 {!numberReady&&<p className="form-hint" role="alert">Nomor nota belum aktif. Simpan Order akan ditolak sampai Owner mengaktifkannya; tidak ada order tanpa nomor.</p>}
 <div className="form-grid">
  <SearchableChoice label="Outlet" placeholder="Ketik nama outlet, misalnya SIDRAP" choices={outletChoices} value={outlet} onChange={setOutlet}/>
  <label>Jadwal pengiriman<input name="deliveryDate" type="date"/></label>
  <label className="wide">Catatan order<input name="note" maxLength={400} placeholder="Instruksi outlet"/></label>
 </div>
 <div className="order-items">
  <div className="order-items-head"><strong>Produk dipesan</strong><button className="text-action" type="button" onClick={()=>setItems(old=>old.length<30?[...old,{productId:"",quantity:1,unitPrice:null}]:old)}>+ Tambah baris</button></div>
  {items.map((item,i)=><div className="order-item-row" key={i}>
   <label>Produk<select required value={item.productId} onChange={e=>update(i,{productId:e.target.value,unitPrice:null})}><option value="" disabled>Pilih produk</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {rp(Number(p.price))} / {p.unit}</option>)}</select></label>
   <label>Jumlah<input required min="1" step="1" type="number" value={item.quantity} onChange={e=>update(i,{quantity:Number(e.target.value)})}/></label>
   {canOverride&&<label>Harga transaksi (Rp)<input inputMode="numeric" type="text" value={item.unitPrice===null?(item.productId&&master(item.productId)>0?groupedRupiah(master(item.productId)):""):groupedRupiah(item.unitPrice)} placeholder="Contoh: 30.000" onChange={e=>update(i,{unitPrice:e.target.value===""?null:rupiahDigits(e.target.value)})}/></label>}
   {canOverride&&item.productId&&<span className="form-hint">{nominalLabel(item.unitPrice??master(item.productId))} / butir</span>}
   <button type="button" className="remove-line" disabled={items.length===1} onClick={()=>setItems(old=>old.filter((_,j)=>j!==i))}>Hapus</button>
  </div>)}
 </div>
 {canOverride&&changed&&<label className="wide">Alasan harga khusus (wajib)<input name="priceReason" value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={400} required placeholder="Kesepakatan harga dengan outlet"/></label>}
 <div className="order-submit"><span><span className="small-muted">Total nilai order</span><strong>{rp(total)} <small className="form-hint">({nominalLabel(total)})</small></strong></span><SubmitButton className="primary-button" disabled={!valid}>Simpan Order</SubmitButton></div>
 <p className="form-hint">Nomor nota 7 digit langsung diterbitkan saat order tersimpan. Nomor terlihat di konfirmasi dan daftar order. Stok baru berkurang saat barang dikirim.</p>
 </form>;
}
