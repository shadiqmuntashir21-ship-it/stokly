import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=async(s:string)=>readFile(s,"utf8");
test("Admin/Marketing can enter without device approvals",async()=>{
 const entry=await read("src/app/rooms/actions.ts");
 const access=await read("src/lib/access.ts");
 assert.match(entry,/room!=="admin"&&room!=="marketing"/);
 assert.match(entry,/jar\.set\(ROOM_COOKIE,room/);
 assert.doesNotMatch(entry,/getStaffDevice|DEVICE_COOKIE|approved/);
 assert.match(access,/return staffActor\(room\)/);
 assert.doesNotMatch(access,/getStaffDevice|DEVICE_COOKIE|devices\/request/);
});
test("Owner remains session-protected",async()=>{
 const access=await read("src/lib/access.ts");
 assert.match(access,/session\.user\.id/);
 assert.match(access,/roles\[0\]\?\.role==="owner"/);
 assert.match(access,/if\(actor\.role!=="owner"\)redirect\("\/login"\)/);
});
test("Landing keeps the genuine logo at normal size and does not duplicate it",async()=>{
 const rooms=await read("src/app/rooms/page.tsx");
 const brand=await read("src/components/brand.tsx");
 const dashboard=await read("src/app/(private)/dashboard/page.tsx");
 assert.doesNotMatch(rooms,/landing-art|devices\/request/);
 assert.match(rooms,/tanpa PIN atau persetujuan perangkat/);
 assert.match(brand,/kelapa-brand\.webp/);
 assert.doesNotMatch(brand,/kelapa-brand-hd\.webp/);
 assert.doesNotMatch(dashboard,/dashboard-hero-mark/);
});
