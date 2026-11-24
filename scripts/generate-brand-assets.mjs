import sharp from "sharp";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const root=process.cwd();
const source=join(root,"public/brand/kelapa-go-symbol.svg");
const iconDir=join(root,"public/icons");
await mkdir(iconDir,{recursive:true});
const svg=await readFile(source);
await sharp(svg,{density:480}).resize(1200,1200).webp({quality:95,effort:5}).toFile(join(root,"public/brand/kelapa-brand-hd.webp"));
for(const size of [192,512,1024]){
 await sharp(svg,{density:480}).resize(size,size).png({compressionLevel:9}).toFile(join(iconDir,"icon-"+size+".png"));
}
await writeFile(join(iconDir,"icon.svg"),svg);
console.log("KELAPA GO brand assets generated");
