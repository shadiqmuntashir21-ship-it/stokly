import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { currentDevice, ROOM_COOKIE } from "@/lib/trusted-devices";

export type Role = "owner" | "admin" | "marketing";
export type Actor = { id:string; name:string; email:string; role:Role };

export async function requireOwner(): Promise<Actor> {
  const session=await auth.api.getSession({headers:await headers()});
  if(!session) redirect("/login");
  const rows=await query<{role:Role}>(
    "SELECT role FROM user_roles WHERE user_id=$1 LIMIT 1",[session.user.id]
  );
  if(rows[0]?.role!=="owner") redirect("/rooms?denied=1");
  return {id:session.user.id,name:session.user.name,email:session.user.email,role:"owner"};
}

export async function requireActor(allowed?:Role[]): Promise<Actor> {
  const session=await auth.api.getSession({headers:await headers()});
  if(session){
    const roles=await query<{role:Role}>(
      "SELECT role FROM user_roles WHERE user_id=$1 LIMIT 1",[session.user.id]);
    if(roles[0]?.role==="owner"){
      return {id:session.user.id,name:session.user.name,email:session.user.email,role:"owner"};
    }
  }

  const device=await currentDevice();
  if(!device) redirect("/rooms?device=required");
  const room=(await cookies()).get(ROOM_COOKIE)?.value;
  if(room!=="admin" && room!=="marketing") redirect("/rooms");
  if(allowed && !allowed.includes(room)) redirect("/rooms?denied=1");
  return {
    id:"stokly:room:"+room,
    name:room==="admin"?"Room Admin":"Room Marketing",
    email:"room-"+room+"@accounts.stokly.invalid",
    role:room
  };
}
