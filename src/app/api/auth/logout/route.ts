import { NextResponse } from "next/server";
import { clearSessionCookie, redirectTo } from "@/lib/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await clearSessionCookie();
  return redirectTo(request, "/");
}
