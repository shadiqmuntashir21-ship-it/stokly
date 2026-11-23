"use client";
import {useState} from "react";
import {payAction} from "@/app/(private)/order-actions";
import {SubmitButton} from "@/components/submit-button";
import {invoiceBalance} from "@/lib/business-math";
import {rupiahDigits,groupedRupiah,nominalLabel} from "@/lib/rupiah-input";
type Invoice={id:string;document_number:string|null;outlet:string;gross:string;credit:string;paid:string;deliveries:number;status:string};
const currency=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
const due=(x:Invoice)=>invoiceBalance(x.gross,x.credit,x.paid).due;
export function PaymentComposer({invoices,requestKey,initialOrder=""}:{invoices:Invoice[];requestKey:string;initialOrder?:string}){
 const options=invoices.filter(x=>x.status!=="cancelled"&&x.deliveries>0&&due(x)>0);
 const [selected,setSelected]=useState(initialOrder&&options.some(x=>x.id===initialOrder)?initialOrder:"");
 const active=options.find(x=>x.id===selected);
 const [amount,setAmount]=useState(active?String(Math.round(due(active))):"");
 const current=rupiahDigits(amount);
 return <form action={payAction} className="form-grid">
  <input type="hidden" name="requestKey" value={requestKey}/>
  <label className="wide">Cari nomor kwitansi / Outlet<select name="orderId" required value={selected} onChange={e=>{setSelected(e.target.value);const row=options.find(x=>x.id===e.target.value);setAmount(row?String(Math.round(due(row))):"");}}>
   <option value="" disabl¶»§q«^