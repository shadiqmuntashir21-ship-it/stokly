import {createHash} from "node:crypto";
import {getPool,query} from "@/lib/db";
import {BusinessError} from "@/lib/operations";
import {makeZip,type ZipEntry} from "@/lib/zip-writer";
import {datasets} from "@/lib/archive-spec";

export function validateArchiveYear(value:number){
 const now=Number(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Makassar",year:"numeric"}).format(new Date()));
 if(!Number.isSafeInteger(value)||value<2024||value>now)throw new BusinessError("Tahun arsip tidak valid.");
}
const hash=(data:Buffer|string)=>createHash("sha256").update(data).digest("hex");
const cell=(value:unknown)=>{
 let str=value===null||value===undefined?"":typeof value==="object"?JSON.stringify(value):String(value);
 if(/^[\s]*[=+\-@\t\r]/.test(str))str="'"+str;
 return '"'+str.replaceAll('"','""')+'"';
};
export function encodeCsv(rows:Record<string,unknown>[]):string{
 if(!rows.length)return "\ufeff";
 const names=Object.keys(rows[0]);
 return "\ufeff"+[names.map(cell).join(","),...rows.map(row=>names.map(k=>cell(row[k])).join(","))].join("\r\n")+"\r\n";
}
export type ArchiveInfo={id:string;archive_year:number;sha256:string;byte_size:string;record_counts:Record<string,number>;exported_at:Date;verified_at:Date|null};
export async function archiveHistory(){
 return query<ArchiveInfo>("SELECT id::text,archive_year,sha256,byte_size::text,record_counts,exported_at,verified_at FROM annual_archive_exports ORDER BY exported_at DESC LIMIT 30");
}
export async function verifyArchive(id:string,sha:string,confirm:boolean,actor:string){
 if(!/^[a-f0-9-]{36}$/i.test(id)||!/^[a-f0-9]{64}$/.test(sha)||!confirm)
  throw new BusinessError("Pilih file arsip ZIP dan pastikan SHA-256 sesuai.");
 const updated=await query<{id:string}>(
  "UPDATE annual_archive_exports SET verified_at=now(),verified_by=$3,verification_note='SHA-256 lokal cocok dengan hash server' WHERE id=$1 AND sha256=$2 AND verified_at IS NULL RETURNING id::text",
  [id,sha,actor]);
 if(!updated.length)throw new BusinessError("Arsip tidak ditemukan, checksum berbeda, atau sudah diverifikasi.");
}
export async function buildAnnualArchive(year:number,actor:string):Promise<{zip:Buffer;sha256:string;counts:Record<string,number>}>{
 validateArchiveYear(year);
 const client=await getPool().connect();
 const entries:ZipEntry[]=[];
 const checksums:Record<string,string>={};
 const counts:Record<string,number>={};
 let totalBytes=0;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  for(const item of datasets){
   const sql="SELECT to_jsonb(row) AS record FROM ("+item.sql+") row LIMIT 150001";
   const result=await client.query<{record:Record<string,unknown>}>(sql,item.master?[]:[year]);
   if(result.rows.length>150000)throw new BusinessError("Data terlalu besar untuk satu file. Ekspor per semester diperlukan.");
   const records=result.rows.map(r=>r.record),json=JSON.stringify({table:item.file,year,rows:records});
   const csv=encodeCsv(records),a=item.file+".json",b=item.file+".csv";
   counts[item.file]=records.length;checksums[a]=hash(json);checksums[b]=hash(csv);
   totalBytes+=Buffer.byteLength(json)+Buffer.byteLength(csv);
   if(totalBytes>100*1024*1024)throw new BusinessError("Arsip lebih besar dari 100 MB. Lakukan ekspor bertahap.");
   entries.push({name:a,data:json},{name:b,data:csv});
  }
  await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK").catch(()=>null);throw e;}finally{client.release();}
 const manifest={
  schema:"STOKLY_OPERATIONAL_ARCHIVE_V1",year,generated_at:new Date().toISOString(),
  archive_basis:"order_year_with_linked_delivery_and_payments; procurement_received_year; expenses_incurred_year",
  note:"Arsip operasional, bukan pengganti backup PostgreSQL lengkap. Master data dan saldo yang diekspor adalah snapshot saat unduhan, BUKAN saldo 31 Desember. Jangan menghapus data berjalan.",
  sensitive_exclusions:["authentication_sessions","pin_credentials","authorization_tokens"],
  counts,files_sha256:checksums
 };
 entries.unshift({name:"manifest.json",data:JSON.stringify(manifest,null,2)});
 const zip=makeZip(entries),sha256=hash(zip);
 await query("INSERT INTO annual_archive_exports(archive_year,sha256,byte_size,record_counts,exported_by) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT(archive_year,sha256) DO NOTHING",
  [year,sha256,zip.length,JSON.stringify(counts),actor]);
 return {zip,sha256,counts};
}
