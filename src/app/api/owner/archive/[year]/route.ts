import {requireOwner} from "@/lib/access";
import {buildAnnualArchive,validateArchiveYear} from "@/lib/annual-archive";
export const runtime="nodejs";
export const maxDuration=60;
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{year:string}>}){
 const owner=await requireOwner();
 const {year:raw}=await params,year=Number(raw);
 try{
  validateArchiveYear(year);
  const {zip}=await buildAnnualArchive(year,owner.id);
  let cursor=0;
  const stream=new ReadableStream<Uint8Array>({
   pull(controller){
    if(cursor>=zip.byteLength){controller.close();return;}
    const slice=zip.subarray(cursor,Math.min(cursor+64*1024,zip.byteLength));
    controller.enqueue(new Uint8Array(slice));cursor+=slice.byteLength;
   }
  });
  return new Response(stream,{headers:{
   "Content-Type":"application/zip",
   "Content-Disposition":'attachment; filename="STOKLY-Arsip-'+year+'.zip"',
   "Cache-Control":"private, no-store, max-age=0",
   "X-Content-Type-Options":"nosniff"
  }});
 }catch(e){
  return new Response(e instanceof Error?e.message:"Tidak dapat membuat arsip",{status:400,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}});
 }
}
