"use client";
import {SubmitButton} from "@/components/submit-button";
import {useState} from "react";
import {rupiahDigits,groupedRupiah,nominalLabel} from "@/lib/rupiah-input";
import {createOrderAction} from "@/app/(private)/order-actions";
type Product={id:string;name:string;price:string;stock:number;unit:string};
type Outlet={id:string;name:string;active:boolean};
type Item={productId:string;quantity:number;unitPrice:number|null};
const rp=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function OrderComposer({products,outlets,requestKey,canOverride,numberReady,initialOutlet="",initialItems=[]}:{products:Product[];outlets:Outlet[];requestKey:string;canOverride:boolean;numberReady:boolean;initialOutlet?:string;initialItems?:Item[]}){
 const [items,setItems]=useState<Item[]>(initialItems.length?initialItems:[{productId:"",quantity:1,unitPrice:null}]);
 const [outlet,setOutlet]=useState(initialOutlet);
 const [reason,setReason]=useState("");
 const master=(id:string)=>Number(products.find(p=>p.id===id)?.price??0);
 const changed=items.some(x=>x.productId&&x.unitPrice!==null&&Math.round(x.unitPrice*100)!==Math.round(master(x.productId)*100));
 const valid=!!outlet&&items.length>0&&items.every(x=>x.productId&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&(x.unitPrice===null||Number.isFinite(x.unitPrice)&&x.unitPrice>=0))&&new Set(items.map(x=>x.productId)).size===items.length&&(!changed||canOverride&&rea¶»§q«^