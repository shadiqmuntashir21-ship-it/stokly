export function rupiahDigits(raw:string):number {
 const digits=raw.replace(/[^0-9]/g,"");
 if(!digits)return 0;
 const n=Number(digits);
 return Number.isSafeInteger(n)?n:0;
}
export const groupedRupiah=(n:number)=>Math.round(n).toLocaleString("id-ID");
export function nominalLabel(n:number):string {
 if(!Number.isFinite(n)||n<0)return "Nominal tidak valid";
 const compact=(v:number)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(v);
 if(n>=1_000_000_000)return compact(n/1_000_000_000)+" miliar rupiah";
 if(n>=1_000_000)return compact(n/1_000_000)+" juta rupiah";
 if(n>=1_000)return compact(n/1_000)+" ribu rupiah";
 return groupedRupiah(n)+" rupiah";
}
