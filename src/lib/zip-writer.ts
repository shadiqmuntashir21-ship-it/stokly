import {deflateRawSync} from "node:zlib";

export type ZipEntry={name:string;data:Buffer|string};
const crcTable=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
export function crc32(input:Uint8Array):number{
 let crc=0xffffffff;for(const b of input)crc=crcTable[(crc^b)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
export function makeZip(entries:ZipEntry[]):Buffer{
 if(entries.length<1||entries.length>250)throw Error("Jumlah file arsip tidak valid");
 const local:Buffer[]=[],central:Buffer[]=[];
 let offset=0;
 const date=new Date();
 const time=(date.getUTCHours()<<11)|(date.getUTCMinutes()<<5)|(Math.floor(date.getUTCSeconds()/2));
 const day=((Math.max(1980,date.getUTCFullYear())-1980)<<9)|((date.getUTCMonth()+1)<<5)|date.getUTCDate();
 for(const entry of entries){
  if(!/^[a-z0-9][a-z0-9_.-]{0,150}$/i.test(entry.name))throw Error("Nama file arsip tidak aman");
  const name=Buffer.from(entry.name,"utf8"),raw=typeof entry.data==="string"?Buffer.from(entry.data,"utf8"):entry.data;
  const compressed=deflateRawSync(raw,{level:6}),check=crc32(raw);
  if(raw.length>0xffffffff||compressed.length>0xffffffff)throw Error("File arsip terlalu besar");
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);
  h.writeUInt16LE(8,8);h.writeUInt16LE(time,10);h.writeUInt16LE(day,12);h.writeUInt32LE(check,14);
  h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(name.length,26);
  local.push(h,name,compressed);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
  c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(time,12);c.writeUInt16LE(day,14);
  c.writeUInt32LE(check,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(raw.length,24);
  c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
  central.push(c,name);offset+=h.length+name.length+compressed.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0);
 const e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(entries.length,8);
 e.writeUInt16LE(entries.length,10);e.writeUInt32LE(centralSize,12);e.writeUInt32LE(offset,16);
 const out=Buffer.concat([...local,...central,e]);
 if(out.length>80*1024*1024)throw Error("Arsip melebihi 80 MB. Pecah per periode sebelum unduhan.");
 return out;
}
