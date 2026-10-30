import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

export const DEVICE_COOKIE = "stokly_device";
export const ROOM_COOKIE = "stokly_room";
export const DEVICE_MAX_AGE = 60*60*24*180;

export const hashDeviceToken = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export async function currentDevice(): Promise<{id:string;label:string}|null> {
  const jar=await cookies();
  const token=jar.get(DEVICE_COOKIE)?.value;
  if(!token || !/^[a-zA-Z0-9_-]{40,80}$/.test(token)) return null;
  const devices=await query<{id:string;label:string}>(
    "SELECT id::text,label FROM trusted_devices WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now() LIMIT 1",
    [hashDeviceToken(token)]
  );
  return devices[0] ?? null;
}
