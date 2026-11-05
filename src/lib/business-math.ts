/** STOKLY financial rules in integer cents; never use floating point to determine balances. */
export function toCents(value:number|string):number{
 const n=Number(value);
 if(!Number.isFinite(n)||Math.abs(n)>1e12)throw new Error("Nilai uang tidak valid.");
 return Math.round(n*100);
}
export function invoiceBalance(gross:number|string,returns:number|string,paid:number|string){
 const grossCents=toCents(gross),returnCents=toCents(returns),paidCents=toCents(paid);
 if(grossCents<0||returnCents<0||paidCents<0||returnCents>grossCents)
  throw new Error("Nilai kwitansi tidak konsisten.");
 const finalCents=grossCents-returnCents;
 return {final:finalCents/100,due:Math.max(0,finalCents-paidCents)/100,overpaid:Math.max(0,paidCents-finalCents)/100};
}
export function formatReceiptNumber(n:number){
 if(!Number.isSafeInteger(n)||n<1||n>9999999)throw new Error("Nomor kwitansi di luar rentang.");
 return String(n).padStart(7,"0");
}
