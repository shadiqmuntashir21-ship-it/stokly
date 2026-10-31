import { redirect } from "next/navigation";
import { BusinessError } from "@/lib/operations";
export async function safeWrite<T>(path:string,operation:()=>Promise<T>):Promise<T>{
 try{return await operation();}
 catch(error){
  let message="Data tidak dapat disimpan. Periksa isian dan coba kembali.";
  if(error instanceof BusinessError)message=error.message;
  else if(error&&typeof error==="object"&&"code" in error){
   if(error.code==="23505")message="Kode atau nomor sudah digunakan. Periksa kembali.";
   else if(error.code==="23503")message="Data terkait tidak ditemukan atau telah dinonaktifkan.";
   else if(error.code==="23514")message="Jumlah atau nilai tidak memenuhi aturan.";
  }
  redirect(path+"?error="+encodeURIComponent(message));
 }
}
