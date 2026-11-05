import {headers,cookies} from "next/headers";
import {redirect} from "next/navigation";
import {cache} from "react";
import {query} from "@/lib/db";
import {ROOM_COOKIE,DEVICE_COOKIE,getStaffDevice} from "@/lib/trusted-devices";

export type Role="owner"|"admin"|"marketing";
export type Actor={id:string;name:string;email:string;role:Role;deviceId?:string};
const staffActor=(device:{id:string;operator_name:string;role:"admin"|"marketing"}):Actor=>({
 id:"stokly:room:"+device.role,
 name:device.operator_name,
 email:"room-"+device.role+"@accounts.stokly.invalid",
 role:device.role,
 deviceId:device.id
});
const resolveActor=cache(async ():Promise<Actor>=>{
 const jar=await cookies();
 const room=jar.get(ROOM_COOKIE)?.value;
 const hasAuthCookie=jar.getAll().some(c=>c.name==="better-auth.session_token"||c.name==="__Secure-better-auth.session_token");
 if(hasAuthCookie){
  const [{auth},requestHeaders]=await Promise.all([import("@/lib/auth"),headers()]);
  const session=await auth.api.getSession({headers:requestHeaders});
  if(session){
   const roles=await query<{role:Role}>("SELECT role FROM user_roles WHERE user_id=$1 LIMIT 1",[session.user.id]);
   if(roles[0]?.role==="owner")return {id:session.user.id,name:session.user.name,email:session.user.email,role:"owner"};
  }
 }
 if(room==="admin"||room==="marketing"){
  const device=await getStaffDevice(jar.get(DEVICE_COOKIE)?.value);
  if(device&&device.status==="approved"&&device.role===room)return staffActor(device);
  redirect("/devices/request?room="+room);
 }
 redirect("/rooms");
});
export async function requireActor(allowed?:Role[]):Promise<Actor>{
 const actor=await resolveActor();
 if(allowed&&actor.role!=="owner"&&!allowed.includes(actor.role))redirect("/rooms?denied=1");
 return actor;
}
export async function requireOwner():Promise<Actor>{
 const actor=await resolveActor();
 if(actor.role!=="owner")redirect("/login");
 return actor;
}
