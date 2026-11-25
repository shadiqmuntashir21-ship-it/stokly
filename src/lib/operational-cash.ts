import {query} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
export type Wallet="SMALL"|"LARGE";
export type WalletBalance={wallet:Wallet;opening:string|null;incoming:string;outgoing:string;balance:string|null};
export async function walletBalances(){
 return query<WalletBalance>("WITH wallets(wallet) AS (VALUES ('SMALL'),('LARGE')), classified AS (SELECT CASE WHEN category LIKE 'KAS BESAR:%' OR category='PENJUALAN TRANSFER' THEN 'LARGE' ELSE 'SMALL' END wallet,direction,amount FROM cash_ledger_entries WHERE voided_at IS NULL), totals AS (SELECT wallet,COALESCE(SUM(amount) FILTER(WHERE direction='IN'),0) incoming,COALESCE(SUM(amount) FILTER(WHERE direction='OUT'),0) outgoing FROM classified GROUP BY wallet) SELECT w.wallet,o.amount::text AS opening,COALESCE(t.incoming,0)::text incoming,COALESCE(t.outgoing,0)::text outgoing,CASE WHEN o.wallet IS NOT NULL THEN (o.amount+COALESCE(t.incoming,0)-COALESCE(t.outgoing,0))::text ELSE NULL END balance FROM wallets w LEFT JOIN operational_cash_openings o ON o.wallet=w.wallet LEFT JOIN totals t ON t.wallet=w.wallet ORDER BY w.wallet DESC");
}
export async function setOpeningBalance(input:{wallet:string;amount:number;reason:string},actor:string){
 if(!["SMALL","LARGE"].includes(input.wallet)||!Number.isSafeInteger(input.amount)||input.amount<0||input.amount>1e12||input.reason.trim().length<5||input.reason.length>400)throw new BusinessError("Saldo awal tidak valid. Masukkan rupiah penuh dan keterangan minimal 5 karakter.");
 const rows=await query<{wallet:string}>("INSERT INTO operational_cash_openings(wallet,amount,reason,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(wallet) DO NOTHING RETURNING wallet",[input.wallet,input.amount,input.reason.trim(),actor]);
 if(!rows.length)throw new BusinessError("Saldo awal kas ini sudah ditetapkan. Jangan masukkan saldo awal dua kali.");
}
