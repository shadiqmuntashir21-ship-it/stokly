import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {RupiahField} from "@/components/rupiah-field";
import {newCashEntryAction} from "../go-actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Entry={id:string;entry_date:string;direction:string;category:string;description:string;amount:string};
type Legacy={source_row:number;entry_date:string|null;description:string;money_in:string;money_out:string;recorded_balance:string|null;category:string|null};
export default async function Cash({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [p,entries,history,summary]=await Promise.all([
  searchParams,
  query<Entry>("SELECT id::text,entry_date::text,direction,category,description,amount::text FROM cash_ledger_entries ORDER BY entry_date DESC,created_at DESC LIMIT 120"),
  query<Legacy>("SELECT source_row,entry_date::text,description,money_in::text,money_out::text,recorded_balance::text,category FROM legacy_cash_entries ORDER BY source_row DESC LIMIT 120"),
  query<{opening_balance:string;new_in:string;new_out:string;large_in:string;large_out:string}>(
   "SELECT (SELECT recorded_balance::t¶»§q«^