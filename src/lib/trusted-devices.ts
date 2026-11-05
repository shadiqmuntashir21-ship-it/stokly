import {createHash,randomBytes} from "node:crypto";
import {query} from "@/lib/db";
export const ROOM_COOKIE="stokly_room";
export const DEVICE_COOKIE="stokly_staff_device_v4";
const tokenValid=(s:string)=>/^[a-f0-9]{64}$/.test(s);
export const newDeviceToken=()=>randomBytes(32).toString("hex");
export const deviceTokenHash=(s:string)=>createHash("sha256").update(s).digest("hex");
export type StaffDevice={id:string;operator_name:string;role:"admin"|"marketing";status:"pending"|"approved"|"revoked"};
export async function getStaffDevice(token?:string):Promise<StaffDevice|null>{
 if(!token||!tokenValid(token))return null;
 const rows=await query<StaffDevice>("SELECT id::text,operator_name,role,status FROM staff_devices WHERE token_hash=$1 LIMIT 1",[deviceTokenHash(token)]);
 return rows[0]||null;
}
