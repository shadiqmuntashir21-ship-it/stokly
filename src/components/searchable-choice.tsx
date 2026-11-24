"use client";
import {useId,useState} from "react";
export type Choice={id:string;label:string;search?:string;detail?:string};
export function SearchableChoice({label,placeholder,choices,value,onChange}:{label:string;placeholder:string;choices:Choice[];value:string;onChange:(value:string)=>void}){
 const id=useId(), selected=choices.find(x=>x.id===value);
 const [term,setTerm]=useState(""),[open,setOpen]=useState(false),[highlight,setHighlight]=useState(0);
 const matches=choices.filter(x=>(x.label+" "+(x.search||"")).toLocaleLowerCase("id-ID").includes(term.trim().toLocaleLowerCase("id-ID")));
 const visible=matches.slice(0,30);
 const choose=(choice:Choice)=>{onChange(choice.id);setTerm("");setOpen(false);setHighlight(0);};
 return <div style={{position:"relative",minWidth:0}}>
  <label htmlFor={id}>{label}</label>
  <input id={id} type="text" role="combobox" autoComplete="off" placeholder={placeholder} aria-expanded={open} aria-controls={id+"-options"} aria-autocomplete="list" aria-activedescendant={open&&visible[highlight]?id+"-"+highlight:undefined}
   value={open?term:selected?.label||""} onFocus={()=>{setTerm(selected?.label||"");setHighlight(0);setOpen(true);}} onChange={e=>{setTerm(e.target.value);onChange("");setHighlight(0);setOpen(true);}}
   onBlur={()=>{setOpen(false);setTerm("");}}
   onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);e.preventDefault();}else if(e.key==="ArrowDown"){e.preventDefault();setOpen(true);setHighlight(i=>Math.min(visible.length-1,Math.max(0,i+1)));}else if(e.key==="ArrowUp"){e.preventDefault();setHighlight(i=>Math.max(0,i-1));}else if(e.key==="Enter"&&open){e.preventDefault();if(visible[highlight])choose(visible[highlight]);}}}/>
  {open&&<div id={id+"-options"} role="listbox" aria-label={label} style={{position:"absolute",zIndex:20,top:"100%",left:0,right:0,maxHeight:280,overflowY:"auto",background:"white",border:"1px solid #cdded2",borderRadius:10,boxShadow:"0 8px 24px #173c2522"}}>
   {visible.map((x,i)=><button key={x.id} id={id+"-"+i} role="option" aria-selected={x.id===value} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>choose(x)} style={{display:"block",width:"100%",textAlign:"left",border:0,borderBottom:"1px solid #edf1ed",background:i===highlight?"#e7f0df":"white",padding:"12px",color:"#173c25",cursor:"pointer"}}><strong>{x.label}</strong>{x.detail&&<small style={{display:"block",marginTop:4}}>{x.detail}</small>}</button>)}
   {!visible.length&&<p role="status" style={{padding:12}}>Tidak ditemukan. Coba kata lain.</p>}
   {matches.length>30&&<p style={{padding:12}}>Ketik lebih spesifik untuk melihat hasil lainnya.</p>}
  </div>}
 </div>;
}
