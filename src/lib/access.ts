import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export type Role = "owner" | "admin" | "marketing";
export type Actor = { id: string; name: string; email: string; role: Role };

export async function requireActor(allowed?: Role[]): Promise<Actor> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const memberships = await query<{role: Role}>(
    "SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1",
    [session.user.id]
  );
  const role = memberships[0]?.role;
  if (!role) redirect("/no-access");
  if (allowed && !allowed.includes(role)) redirect("/dashboard?denied=1");
  return { id: session.user.id, name: session.user.name, email: session.user.email, role };
}
