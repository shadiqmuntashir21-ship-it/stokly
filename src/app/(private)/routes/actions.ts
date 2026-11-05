"use server";
import {requireActor} from "@/lib/access";
import {redirect} from "next/navigation";
export async function routeCreate(_f:FormData){await requireActor(["owner","admin"]);redirect("/cash");}
export async function routeStop(_f:FormData){await requireActor(["owner","admin"]);redirect("/cash");}
export async function routeCost(_f:FormData){await requireActor(["owner","admin"]);redirect("/cash");}
