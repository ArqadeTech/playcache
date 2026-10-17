import { NextResponse } from "next/server";
import { clearSessionCookie, siteUrl } from "@/lib/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await clearSessionCookie();
  return NextResponse.redirect(`${siteUrl()}/`);
}
