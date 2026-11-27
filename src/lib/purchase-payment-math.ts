export const toCents=(n:number)=>Math.round(n*100);
export function validPaymentAmount(n:number){return Number.isFinite(n)&&n>=0&&n<=1e12&&Number.isSafeInteger(toCents(n))&&Math.abs(n*100-toCents(n))<0.01;}
export function paymentSplitValid(status:string,total:number,small:number,large:number){
 if(![total,small,large].every(validPaymentAmount)||total<=0)return false;
 const paid=toCents(small)+toCents(large),due=toCents(total);
 return status==="paid"?paid===due:status==="partial"?paid>0&&paid<due:status==="unpaid"?paid===0:false;
}

export type CashAvailability={SMALL:number|null;LARGE:number|null};
export function purchaseFundingError(available:CashAvailability,small:number,large:number):string{
 for(const [wallet,amount] of [["SMALL",small],["LARGE",large]] as const){
  if(amount<=0)continue;
  const name=wallet==="SMALL"?"Kas Kecil":"Kas Besar";
  const balance=available[wallet];
  if(balance===null||!Number.isFinite(balance))return name+" belum memiliki saldo awal terverifikasi.";
  if(toCents(amount)>toCents(balance))return "Saldo "+name+" tidak mencukupi.";
 }
 return "";
}
