import { NextResponse } from "next/server";
import { setSessionCookie, siteUrl } from "@/lib/session";
import { fetchSteamUser, verifySteamOpenId } from "@/lib/steam";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  try {
    const steamId = await verifySteamOpenId(query);
    if (!steamId) {
      return NextResponse.redirect(
        `${siteUrl()}/?error=steam_verify_failed`,
      );
    }
    const user = await fetchSteamUser(steamId);
    await setSessionCookie(user, false);
    return NextResponse.redirect(`${siteUrl()}/library`);
  } catch {
    return NextResponse.redirect(`${siteUrl()}/?error=steam_auth_error`);
  }
}
