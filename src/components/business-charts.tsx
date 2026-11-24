import {rupiah} from "@/components/ui";
export type SeriesPoint={label:string;value:number};
const idr=(n:number)=>new Intl.NumberFormat("id-ID").format(Math.round(n));
const compact=(n:number)=>Math.abs(n)>=1000000?(n/1000000).toLocaleString("id-ID",{maximumFractionDigits:1})+" jt":Math.abs(n)>=1000?(n/1000).toLocaleString("id-ID",{maximumFractionDigits:0})+" rb":idr(n);
export function TrendChart({points,unit="rupiah",empty="Belum ada transaksi untuk periode ini."}:{points:SeriesPoint[];unit?:"rupiah"|"unit";empty?:string}){
 const has=points.some(p=>p.value>0);
 if(!has)return <div className="kg-chart-empty"><strong>Belum ada data grafik</strong><span>{empty}</span></div>;
 const w=880,h=280,left=72,right=22,top=20,bottom=42;
 const max=Math.max(1,...points.map(p=>p.value))*1.14,plotW=w-left-right,plotH=h-top-bottom;
 const coords=points.map((p,i)=>({x:left+(points.length<2?plotW/2:i*plotW/(points.length-1)),y:top+plotH-(p.value/max)*plotH,...p}));
 const line=coords.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ");
 const area=line+" L"+coords[coords.length-1].x+" "+(top+plotH)+" L"+coords[0].x+" "+(top+plotH)+" Z";
 const ticks=new Set([0,Math.max(0,Math.floor((points.length-1)/4)),Math.max(0,Math.floor((points.length-1)/2)),Math.max(0,Math.floor((points.length-1)*3/4)),points.length-1]);
 return <div className="kg-chart-wrap" role="img" aria-label={"Tren "+points.map(p=>p.label+" "+(unit==="rupiah"?rupiah(p.value):idr(p.value))).join(", ")}>
 <svg className="kg-trend-svg" viewBox={"0 0 "+w+" "+h} preserveAspectRatio="xMidYMid meet">
  <defs><linearGradient id="kg-trend-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#48A35B" stopOpacity=".29"/><stop offset="1" stopColor="#48A35B" stopOpacity=".01"/></linearGradient></defs>
  {[0,1,2,3,4].map(i=>{const yy=top+i*plotH/4;return <g key={i}><line x1={left} x2={w-right} y1={yy} y2={yy} stroke="#dae8de" strokeDasharray="4 5"/><text x={left-12} y={yy+4} textAnchor="end" fill="#628071" fontSize="12">{unit==="rupiah"?compact(max*(1-i/4)):idr(max*(1-i/4))}</text></g>;})}
  <path d={area} fill="url(#kg-trend-area)"/><path d={line} fill="none" stroke="#137D4F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  {coords.map((p,i)=><g key={i}>{(points.length<=35||i%4===0)&&<circle cx={p.x} cy={p.y} r="4" fill="#fafff8" stroke="#137D4F" strokeWidth="2.5"/>}<title>{p.label+": "+(unit==="rupiah"?rupiah(p.value):idr(p.value))}</title></g>)}
  {coords.map((p,i)=>ticks.has(i)?<text key={i} x={p.x} y={h-12} fontSize="12" fill="#628071" textAnchor="middle">{p.label}</text>:null)}
 </svg></div>;
}
export function CashMovement({incoming,outgoing}:{incoming:number;outgoing:number}){
 const max=Math.max(1,incoming,outgoing);
 return <div className="kg-cash-bars">
  {[{name:"Penerimaan Kas Kecil",value:incoming,color:"#198254"},{name:"Pengeluaran Kas Kecil",value:outgoing,color:"#E3A449"}].map(x=><div className="kg-meter-row" key={x.name}>
   <div className="kg-meter-label"><span>{x.name}</span><strong>{rupiah(x.value)}</strong></div>
   <div className="kg-meter-track"><div style={{width:(x.value/max*100)+"%",background:x.color}}/></div>
  </div>)}
 </div>;
}
export function OutletRanking({items}:{items:{name:string;value:number;orders:number}[]}){
 if(!items.length)return <p className="form-hint">Belum ada outlet dengan transaksi pada sumber data ini.</p>;
 const max=Math.max(1,...items.map(x=>x.value));
 return <div className="kg-rank-list">{items.map((x,i)=><div key={x.name} className="kg-rank-row">
  <span className="kg-rank-number">{String(i+1).padStart(2,"0")}</span>
  <div className="kg-rank-main"><div className="kg-meter-label"><strong>{x.name}</strong><b>{rupiah(x.value)}</b></div><div className="kg-meter-track"><div style={{width:(x.value/max*100)+"%",background:i===0?"#86C846":"#2D8B65"}}/></div><small>{idr(x.orders)} kuitansi</small></div>
 </div>)}</div>;
}
export function QualityBars({items}:{items:{label:string;used:number;damaged:number}[]}){
 if(!items.some(x=>x.used>0))return <div className="kg-chart-empty"><strong>Belum ada produksi tercatat</strong><span>Grafik akan muncul setelah Admin mencatat produksi harian.</span></div>;
 const max=Math.max(1,...items.map(x=>x.used));
 return <div className="kg-quality-bars">{items.map(x=><div key={x.label} className="kg-quality-day">
   <div className="kg-quality-stack"><div className="kg-quality-bar good" style={{height:((x.used-x.damaged)/max*100)+"%"}} title={"Diproses: "+idr(x.used-x.damaged)}/><div className="kg-quality-bar damaged" style={{height:(x.damaged/max*100)+"%"}} title={"Rusak: "+idr(x.damaged)}/></div>
   <small>{x.label}</small>
 </div>)}</div>;
}
