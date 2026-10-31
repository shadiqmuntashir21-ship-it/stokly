import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { ROOM_COOKIE } from "@/lib/trusted-devices";

export type Role = "owner" | "admin" | "marketing";
export type Actor = { id:string; name:string; email:string; role:Role };

const staffActor=(role:"admin"|"marketing"):Actor=>({
 id:"stokly:room:"+role,
 name:role==="admin"?"Room Admin":"Room Marketing",
 email:"room-"+role+"@accounts.stokly.invalid",
 role
});

// Request-scoped memoization: layout and page must not repeat the same auth/database lookup.
const resolveActor=cache(async ():Promise<Actor>=>{
 const jar=await cookies();
 const room=jar.get(ROOM_COOKIE)?.value;
 const hasAuthCookie=jar.getAll().some(c=>c.name==="better-auth.session_token" || c.name==="__Secure-better-auth.session_token");

 // Admin and Marketing do not sign in: skip Better Auth's database round trip.
 if(!hasAuthCookie && (room==="admin"||room==="marketing")) return staffActor(room);

 // Owner must always be authenticated by the server. Never trust a room cookie for Owner.
 if(hasAuthCookie || room!=="admin"&&room!=="marketing"){
  const session=await auth.api.getSession({headers:await headers()});
  if(session){
   const roles=await query<{role:Role}>("SELECT role FROM user_roles WHERE user_id=$1 LIMIT 1",[session.user.id]);
   if(roles[0]?.role==="owner"){
    return {id:session.user.id,name:session.user.name,email:session.user.email,role:"owner"};
   }
  }
 }
 if(room==="admin"||room==="marketing")return staffActor(room);
 redirect("/rooms");
});

export async function requireActor(allowed?:Role[]):Promise<Actor>{
 const actor=await resolveActor();
 if(allowed && actor.role!=="owner" && !allowed.includes(actor.role))redirect("/rooms?denied=1");
 return actor;
}

export async function requireOwner():Promise<Actor>{
 const actor=await resolveActor();
 if(actor.role!=="owner")redirect("/login");
 return actor;
}
