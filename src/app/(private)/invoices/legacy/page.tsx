import {randomUUID} from "node:crypto";
import Link from "next/link";
import {requireActor} from "@/lib/access";
import {legacyReceiptsSummary} from "@/lib/legacy-payments";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {legacyPaymentAction,legacyBalanceReviewAction} from "./actions";
import {RupiahField} from "@/components/rupiah-field";
import {query} from "@/lib/db";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function LegacyReceipts({searchParams}:{searchParams:Promise<{success?:string;error?:string;number?:string}>}){
 await requireActor(["owner","admin"]);
 const [data,p,reviews]=await Promise.all([legacyReceiptsSummary(),searchParams,query<{document_number:string;new_due:string;reason:string;created_at:string;created_by:string}>("SELECT document_number,new_due::text,reason,(created_at AT TIME ZONE 'Asia/Makassar')::text AS created_at,created_by FROM legacy_receipt_balance_reviews ORDER BY created_at DESC LIMIT 30")]);
 const chosen=data.unpaid.find(x=>x.document_number===p.number&&!x.needs_reconciliation&&Number(x.confirmed_due)>0);
 const review=data.unpaid.find(x=>x.document_number===p.number);
 return <>
  <PageHead eyebrow="KWITANSI / DATA AWAL" title="Piutang & Nota Historis KELAPA GO" description="Rekap otomatis dari status pembaya¶»§q«^