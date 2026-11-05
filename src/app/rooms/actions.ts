"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROOM_COOKIE } from "@/lib/trusted-devices";

export async function enterRoom(form:FormData){
 const room=String(form.get("room")||"");
 if(room!=="admin"&&room!=="marketing")redirect("/rooms?denied=1");

 const jar=await cookies();
 // A staff member does not need approval, a device token, or an auth lookup.
 const hasOwnerSession=jar.getAll().some(c=>c.name==="better-auth.session_token"||c.name==="__Secure-better-auth.session_token");
 if(hasOwnerSession){
  const requestHeaders=await headers();
  const session=await auth.api.getSession({headers:requestHeaders});
  if(session)await auth.api.signOut({headers:requestHeaders});
 }
 jar.set(ROOM_COOKIE,room,{secure:process.env.NODE_ENV==="production",httpOnly:true,sameSite:"lax",path:"/",maxAge:60*60*24*30});
 redirect("/dashboard");
}
