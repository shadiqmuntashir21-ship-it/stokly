import sharp from "sharp";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const root=process.cwd();
const source=join(root,"public/brand/kelapa-brand.webp");
const output=join(root,"public/brand/kelapa-brand-hd.webp");
const iconDir=join(root,"public/icons");
await mkdir(iconDir,{recursive:true});
const original=await readFile(source);
const meta=await sharp(original).metadata();
if(!meta.width||!meta.height)throw Error("Logo asli tidak dapat dibaca");
const h=1200,w=Math.round(h*meta.width/meta.height);
const enhanced=await sharp(original).resize(w,h,{kernel:"lanczos3"})
 .sharpen({sigma:0.75,m1:0.6,m2:1.8}).webp({quality:96,effort:5}).toBuffer();
await writeFile(output,enhanced);
for(const size of [192,512,1024]){
 const m=Math.round(size*(size===1024?0.08:0.15));
 const maxW=size-2*m,maxH=size-2*m;
 const logo=await sharp(enhanced).resize({width:maxW,height:maxH,fit:"inside",kernel:"lanczos3"}).png().toBuffer();
 const lm=await sharp(logo).metadata();
 const left=Math.round((size-(lm.width||0))/2),top=Math.round((size-(lm.height||0))/2);
 await sharp({create:{width:size,height:size,channels:4,background:"#610e1c"}})
  .composite([{input:logo,left,top}]).png({compressionLevel:9}).toFile(join(iconDir,"icon-"+size+".png"));
}
const b64=enhanced.toString("base64");
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="180" fill="#610e1c"/><image href="data:image/webp;base64,'+b64+'" x="128" y="45" width="768" height="934" preserveAspectRatio="xMidYMid meet"/></svg>';
await writeFile(join(iconDir,"icon.svg"),svg);
console.log("Logo asli HD dan favicon berhasil dibuat",meta.width,meta.height);
