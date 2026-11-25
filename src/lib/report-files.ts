import {makeZip,type ZipEntry} from "./zip-writer";
export type Cell=string|number|null;
export type Sheet={name:string;rows:Cell[][]};
const xml=(v:string)=>v.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const main="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const rel="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRel="http://schemas.openxmlformats.org/package/2006/relationships";
function col(n:number){let s="";for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
export function makeWorkbook(sheets:Sheet[]){
 if(!sheets.length||sheets.length>100||new Set(sheets.map(s=>s.name.toLowerCase())).size!==sheets.length||sheets.some(s=>!s.name||s.name.length>31||/[\\/?*:\[\]]/.test(s.name)))throw Error("Nama/jumlah sheet tidak valid");
 const entries:ZipEntry[]=[
 {name:"[Content_Types].xml",data:declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>'},
 {name:"_rels/.rels",data:declaration+'<Relationships xmlns="'+packageRel+'"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
 {name:"xl/workbook.xml",data:declaration+'<workbook xmlns="'+main+'" xmlns:r="'+rel+'"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets></workbook>'},
 {name:"xl/_rels/workbook.xml.rels",data:declaration+'<Relationships xmlns="'+packageRel+'">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+rel+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+'</Relationships>'}
 ];
 for(const [i,s] of sheets.entries()){
  if(s.rows.length>100000||s.rows.some(r=>r.length>256))throw Error("Laporan terlalu besar.");
  const rows=s.rows.map((r,j)=>'<row r="'+(j+1)+'">'+r.map((v,k)=>{
   const ref=col(k)+(j+1);return typeof v==="number"&&Number.isFinite(v)?'<c r="'+ref+'"><v>'+v+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(String(v??"").slice(0,32767))+'</t></is></c>';
  }).join("")+'</row>').join("");
  const width=Math.min(256,Math.max(1,...s.rows.slice(0,10).map(r=>r.length)));
  entries.push({name:"xl/worksheets/sheet"+(i+1)+".xml",data:declaration+'<worksheet xmlns="'+main+'"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="'+width+'" width="22" customWidth="1"/></cols><sheetData>'+rows+'</sheetData></worksheet>'});
 }
 return makeZip(entries);
}
// A simple paginated, text-only PDF. ASCII-compatible output avoids missing font glyphs.
export function makeReportPdf(title:string,lines:string[]){
 const safe=(s:string)=>s.normalize("NFKD").replace(/[^\x20-\x7e]/g,"?").replace(/([\\()])/g,"\\$1");
 const wrapped=lines.flatMap(line=>{const out:string[]=[];let rest=line;while(rest.length>88){let p=rest.lastIndexOf(" ",88);if(p<10)p=88;out.push(rest.slice(0,p));rest=rest.slice(p).trimStart();}return [...out,rest];});
 const pages:string[][]=[];for(let i=0;i<Math.max(1,wrapped.length);i+=44)pages.push(wrapped.slice(i,i+44));
 const objects:string[]=["<< /Type /Catalog /Pages 2 0 R >>","", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
 const pageIds:number[]=[];
 for(const [i,page] of pages.entries()){
  const pageId=objects.length+1,streamId=pageId+1;pageIds.push(pageId);
  const stream="BT /F1 16 Tf 38 800 Td ("+safe(title)+") Tj /F1 10 Tf 0 -22 Td ("+safe("Halaman "+(i+1)+" / "+pages.length)+") Tj "+page.map(x=>"0 -16 Td ("+safe(x)+") Tj").join("\n")+"\nET";
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents "+streamId+" 0 R >>","<< /Length "+Buffer.byteLength(stream)+" >>\nstream\n"+stream+"\nendstream");
 }
 objects[1]="<< /Type /Pages /Count "+pageIds.length+" /Kids ["+pageIds.map(id=>id+" 0 R").join(" ")+"] >>";
 let body="%PDF-1.4\n";const offsets=[0];for(const [i,obj] of objects.entries()){offsets.push(Buffer.byteLength(body));body+=(i+1)+" 0 obj\n"+obj+"\nendobj\n";}
 const xref=Buffer.byteLength(body);body+="xref\n0 "+offsets.length+"\n0000000000 65535 f \n"+offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<< /Size "+offsets.length+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n";
 return Buffer.from(body);
}
