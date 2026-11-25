/** Indonesian executive display: compact only for dashboards, full amount on hover or detailed records. */
export const formatCount=(v:number|string|null|undefined):string=>{
 const n=Number(v??0);
 return Number.isFinite(n)?new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(n):"—";
};
export const formatMoneyCompact=(v:number|string|null|undefined):string=>{
 const n=Number(v??0);
 if(!Number.isFinite(n))return "—";
 const abs=Math.abs(n);
 if(abs<1000)return "Rp "+formatCount(n);
 const units:[[number,string],[number,string],[number,string]]=[[1e9,"miliar"],[1e6,"juta"],[1e3,"ribu"]];
 const [div,unit]=units.find(([value])=>abs>=value)!;
 const scaled=n/div;
 const digits=Math.abs(scaled)>=100?0:1;
 return "Rp "+new Intl.NumberFormat("id-ID",{maximumFractionDigits:digits}).format(scaled)+" "+unit;
};
