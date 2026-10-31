"use server";
import { redirect } from "next/navigation";
export async function activateCurrentDevice(_form:FormData){redirect("/rooms");}
