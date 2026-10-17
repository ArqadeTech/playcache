import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { steamConfigured } from "@/lib/steam";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    authenticated: Boolean(session),
    demo: session?.demo ?? false,
    steamConfigured: steamConfigured(),
    user: session?.user ?? null,
  });
}
