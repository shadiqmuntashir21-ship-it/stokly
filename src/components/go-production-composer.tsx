"use client";
import {useState} from "react";
import {dailyProductionAction} from "@/app/(private)/go-actions";
import {SubmitButton} from "@/components/submit-button";
type Product={id:string;name:string;sku:string};
const categories=[["GO-MAKAN-FULL","Grade A · Makan Full"],["GO-KELAPA-TAR","Grade B · Kelapa Tar"],["GO-SERUT","Kelapa Serut"]] as const;
export function GoProductionComposer({products,requestKey,date,available}:{products:Product[];requestKey:string;date:string;available:number}){
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const [damaged,setDamaged]=useState(0);
 const [used,setUsed]=useState(1);
 const chosen=categories.map(([sku])=>({productId:products.find(x=>x.sku===sku)?.id||"",quantity:quantities[sku]||0})).filter(x=>x.quantity>0);
 const total=chosen.reduce((s,x)=>s+x.quantity,0)+damaged;
 const valid=used>0&&used<=available&&Number.isSafeInteger(used)&&Number.isSafeInteger(damaged)&&damaged>=0&&total===used&&chosen.every(x=>!!x.productId);
 return <form action={dailyProductionAction}>
  <input type="hidden" name="requestKey" value={requestKey}/>
  <input type="hidden" name="outputs" value={JSON.stringify(chosen)}/>
  <div className="form-grid">
   <label>Tanggal produksi<input name="date" type="date" defaultValue={date} required/></label>
   <label>Kelapa diproses<input name="used" type="number" min="1" max={available} step="1" required value={used} onChange={e=>setUsed(Number(e.target.value))}/></label>
  </div>
  <div className="order-items"><div className="order-items-head"><strong>Hasil produksi per kategori</strong></div>
   {categories.map(([sku,label])=><div key={sku} className="order-item-row"><label>{label}<input type="number" min="0" step="1" value={quantities[sku]||0} onChange={e=>setQuantities(q=>({...q,[sku]:Math.max(0,Number(e.target.value))}))}/></label></div>)}
   <div className="order-item-row"><label>Rusak saat produksi<input name="damaged" type="number" min="0" step="1" value={damaged} onChange={e=>setDamaged(Math.max(0,Number(e.target.value)))}/></label></div>
  </div>
  <p className={total===used?"form-hint":"form-hint status-danger"}>Total hasil {total} dari {used} butir · {used-total} belum dipertanggungjawabkan.</p>
  <div className="form-grid"><label className="wide">Catatan kerusakan (opsional)<input name="note" maxLength={400} placeholder="Busuk saat dibuka, bocor, pecah..."/></label></div>
  <div className="order-submit"><span><span className="small-muted">Bahan lolos QC tersedia</span><strong>{available} butir</strong></span><SubmitButton className="primary-button" disabled={!valid}>Simpan Hasil Produksi</SubmitButton></div>
  <p className="form-hint">Tidak perlu memilih batch. Sistem otomatis mengambil bahan baku lolos QC berdasarkan urutan penerimaan dan mencatat HPP bahan baku. Stok hasil jadi bertambah setelah disimpan, sementara rusak tidak masuk stok siap kirim.</p>
 </form>;
}
