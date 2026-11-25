export function normalizeReceiptNumber(value:string):string|null{
 const s=value.trim();return /^[0-9]{1,7}$/.test(s)&&Number(s)>0?s.padStart(7,"0"):null;
}
