"use client";
import {useState} from "react";
import {rupiahDigits,groupedRupiah,nominalLabel} from "@/lib/rupiah-input";
export function RupiahField({name,label,max,initial=0,allowZero=false}:{name:string;label:string;max?:number;initial?:number;allowZero?:boolean}){
 const [raw,setRaw]=useState(initial?String(Math.round(initial)):"");
 const value=rupiahDigits(raw);
 const valid=(allowZero||value>0)&&(max===undefined||value<=max);
 return <label>{label}
  <input type="hidden" name={name} value={value}/>
  <input inputMode="numeric" type="text" placeholder="Contoh: 30.000" value={raw===""?"":groupedRupiah(value)} onChange={e=>setRaw(e.target.value.replace(/[^0-9]/g,""))} required={!allowZero} aria-invalid={!valid}/>
  <span className="form-hint">{nominalLabel(value)}{max!==undefined&&value>max?" — melebihi batas":""}</span>
 </label>;
}
