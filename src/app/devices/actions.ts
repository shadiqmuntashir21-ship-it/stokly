"use server";
import { redirect } from "next/navigation";
export async function revokeDevice(_form:FormData){redirect("/rooms");}
