import sharp from "sharp";
import {readFile,stat} from "node:fs/promises";
const files=[
 ["public/brand/kelapa-brand-hd.webp",1200,0],
 ["public/icons/icon-192.png",192,192],
 ["public/icons/icon-512.png",512,512],
 ["public/icons/icon-1024.png",1024,1024]
];
for(const [file,minH,exactW] of files){
 const content=await readFile(file);
 const meta=await sharp(content).metadata();
 if(!meta.width||!meta.height||meta.height<minH||(exactW&&meta.width!==exactW))
  throw Error("Aset logo tidak mencapai ukuran yang diminta: "+file);
 console.log(file,meta.width+"x"+meta.height,(await stat(file)).size+" bytes");
}
const original=await readFile("public/brand/kelapa-go-symbol.svg","utf8");
if(!original.includes("<svg")||!original.includes("#08432F"))throw Error("Lambang KELAPA GO tidak valid.");
const svg=await readFile("public/icons/icon.svg","utf8");
if(!svg.includes("Lambang KELAPA GO")||!svg.includes("#08432F"))throw Error("Favicon belum menggunakan lambang KELAPA GO.");
console.log("Identitas baru KELAPA GO aktif pada favicon dan semua aset.");
