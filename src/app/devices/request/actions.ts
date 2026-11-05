"use server";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {query} from "@/lib/db";
import {DEVICE_COOKIE,newDeviceToken,deviceTokenHash,getStaffDevice} from "@/lib/trusted-devices";
export async function requestStaffDevice(form:FormData){
 const name=String(form.get("name")||"").trim();
 const role=String(form.get("room")||"");
 if(name.length<2||name.length>100||!["admin","marketing"].includes(role))redirect("/devices/request?error=Periksa%20nama%20dan%20peran");
 const jar=await cookies();
 const current=await getStaffDevice(jar.get(DEVICE_COOKIE)?.value);
 if(current&&current.status!=="revoked")redirect("/devices/request?room="+current.role+"&submitted=1");
 const token=newDeviceToken();
 await query("INSERT INTO staff_devices(token_hash,operator_name,role) VALUES($1,$2,$3)",[deviceTokenHash(token),name,role]);
 jar.set(DEVICE_COOKIE,token,{secure:process.env.NODE_ENV==="production",httpOnly:true,sameSite:"lax",path:"/",maxAge:60*60*24*180});
 redirect("/devices/request?room="+role+"&submitted=1");
}
