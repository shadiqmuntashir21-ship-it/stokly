import {requireOwner} from "@/lib/access";
import {validateArchiveYear} from "@/lib/annual-archive";
import {buildOperationalWorkbook} from "@/lib/operational-workbook";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{year:string}>}){
 await requireOwner();const year=Number((await params).year);
 try{validateArchiveYear(year);}catch{return new Response("Tahun tidak valid",{status:400});}
 const bytes=await buildOperationalWorkbook(year);
 return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":'attachment; filename="KELAPA-GO-Laporan-'+year+'.xlsx"',"Cache-Control":"no-store"}});
}
