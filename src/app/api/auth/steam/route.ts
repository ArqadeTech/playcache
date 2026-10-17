import { NextResponse } from "next/server";
import { setSessionCookie, siteUrl } from "@/lib/session";
import { steamConfigured, steamLoginUrl } from "@/lib/steam";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demo = searchParams.get("demo") === "1";

  if (demo || !steamConfigured()) {
    await setSessionCookie(
      {
        steamId: "76561198000000000",
        personaName: "Demo Player",
        avatarUrl: "",
        profileUrl: "https://steamcommunity.com/",
      },
      true,
    );
    return NextResponse.redirect(`${siteUrl()}/library`);
  }

  return NextResponse.redirect(steamLoginUrl());
}
