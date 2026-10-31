"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROOM_COOKIE } from "@/lib/trusted-devices";

export async function enterRoom(form:FormData){
 const room=String(form.get("room")||"");
 if(room!=="admin" && room!=="marketing") throw new Error("Room tidak valid.");
 const jar=await cookies();
 jar.set(ROOM_COOKIE,room,{secure:process.env.NODE_ENV==="production",httpOnly:true,sameSite:"lax",path:"/",maxAge:60*60*24*30});
 const session=await auth.api.getSession({headers:await headers()});
 if(session){
   await auth.api.signOut({headers:await headers()});
 }
 redirect("/dashboard");
}
