"use client";
import {useState} from "react";
import {SubmitButton} from "@/components/submit-button";
import {assetMovementAction} from "@/app/(private)/go-actions";
type Asset={id:string;name:string;quantity:number;loaned:number};
type Outlet={id:string;name:string};
export function InventoryMovementForm({assets,outlets,today}:{assets:Asset[];outlets:Outlet[];today:string}){
 const [kind,setKind]=useState("OUT");
 const [assetQuery,setAssetQuery]=useState("");
 const [assetId,setAssetId]=useState("");
 const assetChoices=assets.filter(x=>x.name.toLocaleLowerCase("id-ID").includes(assetQuery.trim().toLocaleLowerCase("id-ID"))||x.id===assetId);
 const needsOutlet=kind==="OUT"||kind==="RETURN";
 return <form action={assetMovementAction} className="form-grid">
  <label className="wide">Cari barang inventaris<input type="search" value={assetQuery} onChange={e=>setAssetQuery(e.target.value)} placeholder="Ketik nama barang..."/></label>
  <label className="wide">Barang<select name="assetId" value={assetId} onChange={e=>setAssetId(e.target.value)} required><option value="" disabled>Pilih aset</option>{assetChoices.map(x=><option key={x.id} value={x.id}>{x.name} · total {x.quantity} · dipinjam {x.loaned}</option>)}</select></label>
  <label>Tanggal<input name="date" type="date" required defaultValue={today}/></label>
  <label>Jenis<select name="kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="OUT">Dipinjamkan ke outlet</option><option value="RETURN">Dikembalikan</option><option value="IN">Penambahan aset</option><option value="DAMAGED">Rusak</option><option value="LOST">Hilang</option></select></label>
  <label>Jumlah<input name="quantity" type="number" min="1" step="1" required/></label>
  <label>Outlet {needsOutlet?"(wajib)":"(opsional)"}<select name="outletId" defaultValue="" required={needsOutlet}><option value="">{needsOutlet?"Pilih outlet terlebih dahulu":"Tidak terkait outlet"}</option>{outlets.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  <label className="wide">Keterangan<input name="note" maxLength={400} placeholder="Contoh: 10 keranjang dipinjam oleh outlet"/></label>
  <p className="form-hint wide">{needsOutlet?"Peminjaman dan pengembalian wajib memilih outlet. Jumlah tidak boleh melebihi stok/pinjaman yang tersedia.":"Perubahan stok akan dicatat pada riwayat inventaris."}</p>
  <SubmitButton className="primary-button">Catat Pergerakan</SubmitButton>
 </form>;
}
