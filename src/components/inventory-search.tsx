"use client";
import {useMemo,useState} from "react";
type Asset={id:string;name:string;quantity:number;loaned:number;damaged:number;total_cost:string|null};
type Basket={source_row:number;basket_type:string|null;outlet_name:string|null;quantity:number|null;reported_balance:number|null;note:string|null};
const rupiah=(n:number|string)=>"Rp"+Number(n).toLocaleString("id-ID");
export function InventorySearch({assets,baskets}:{assets:Asset[];baskets:Basket[]}){
 const [search,setSearch]=useState("");
 const match=search.trim().toLocaleLowerCase("id-ID");
 const filtered=useMemo(()=>assets.filter(a=>a.name.toLocaleLowerCase("id-ID").includes(match)),[assets,match]);
 const old=useMemo(()=>baskets.filter(b=>[b.basket_type,b.outlet_name,b.note,String(b.source_row)].join(" ").toLocaleLowerCase("id-ID").includes(match)),[baskets,match]);
 return <>
  <label className="wide">Cari aset, keranjang, atau outlet<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ketik nama aset, keranjang, atau outlet..."/></label>
  <p className="form-hint">Hasil: {filtered.length} jenis inventaris · {old.length} catatan keranjang</p>
  <div className="table-wrap"><table><thead><tr><th>Barang</th><th>Dimiliki</th><th>Dipinjam</th><th>Rusak</th><th>Tersedia (perkiraan)</th><th>Nilai historis</th></tr></thead><tbody>
  {filtered.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.quantity}</td><td>{x.loaned}</td><td>{x.damaged}</td><td>{Math.max(0,x.quantity-x.loaned-x.damaged)}</td><td>{rupiah(x.total_cost??0)}</td></tr>)}
  </tbody></table></div>
  <h3>Riwayat Keranjang KELAPA GO (referensi)</h3>
  <div className="table-wrap"><table><thead><tr><th>Jenis</th><th>Outlet</th><th>Jumlah</th><th>Saldo tertulis</th><th>Catatan</th></tr></thead><tbody>
  {old.map(x=><tr key={x.source_row}><td>{x.basket_type||"—"}</td><td>{x.outlet_name||"—"}</td><td>{x.quantity??"—"}</td><td>{x.reported_balance??"—"}</td><td>{x.note||"—"}</td></tr>)}
  </tbody></table></div>
  <p className="form-hint">Catatan lama bukan peminjaman baru otomatis. Cocokkan fisik sebelum dipakai sebagai saldo.</p>
 </>;
}
