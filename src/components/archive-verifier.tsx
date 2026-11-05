"use client";
import {useState} from "react";
import {verifyArchiveAction} from "@/app/(private)/owner/archive/actions";
import {SubmitButton} from "@/components/submit-button";
type Archived={id:string;year:number;sha256:string;verified:boolean};
export function ArchiveVerifier({archives}:{archives:Archived[]}){
 const [id,setId]=useState(archives.find(x=>!x.verified)?.id||"");
 const [digest,setDigest]=useState("");
 const [checking,setChecking]=useState(false);
 const [error,setError]=useState("");
 const chosen=archives.find(x=>x.id===id);
 async function check(file:File|null){
  setDigest("");setError("");if(!file)return;
  if(!chosen){setError("Pilih catatan ekspor terlebih dahulu.");return;}
  if(file.size>85*1024*1024){setError("File terlalu besar untuk diperiksa di browser.");return;}
  setChecking(true);
  try{
   const data=await file.arrayBuffer();
   const raw=await crypto.subtle.digest("SHA-256",data);
   const hex=Array.from(new Uint8Array(raw),x=>x.toString(16).padStart(2,"0")).join("");
   setDigest(hex);
   if(hex!==chosen.sha256)setError("File tidak cocok dengan checksum arsip yang tercatat. Jangan gunakan untuk pembersihan data.");
  }catch{setError("Browser tidak dapat membaca atau memeriksa file ZIP.");}
  finally{setChecking(false);}
 }
 return <form action={verifyArchiveAction} className="form-grid">
  <label className="wide">Catatan arsip yang akan diverifikasi
   <select value={id} onChange={e=>{setId(e.target.value);setDigest("");setError("");}}>
    <option value="">Pilih ekspor</option>
    {archives.map(x=><option value={x.id} key={x.id}>{x.year} · {x.sha256.slice(0,14)}… {x.verified?"(terverifikasi)":""}</option>)}
   </select>
  </label>
  <label className="wide">Pilih file ZIP yang telah disimpan
   <input type="file" accept=".zip,application/zip" onChange={e=>void check(e.target.files?.[0]||null)}/>
  </label>
  <p className="form-hint wide">SHA-256 file yang dipilih: {digest||"Belum diperiksa"}</p>
  {error&&<p className="error-notice wide" role="alert">{error}</p>}
  <input type="hidden" name="id" value={id}/>
  <input type="hidden" name="sha" value={digest}/>
  <label className="wide"><input type="checkbox" name="confirmed" value="yes" required/> Saya telah menyimpan file ZIP di setidaknya dua lokasi dan checksum cocok.</label>
  <SubmitButton className="primary-button" disabled={checking||!chosen||chosen.verified||!digest||digest!==chosen.sha256}>{checking?"Memeriksa file...":"Tandai Arsip Terverifikasi"}</SubmitButton>
 </form>;
}
