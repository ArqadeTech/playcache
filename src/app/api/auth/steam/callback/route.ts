import { redirectTo, setSessionCookie } from "@/lib/session";
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
      return redirectTo(request, "/?error=steam_verify_failed");
    }
    const user = await fetchSteamUser(steamId);
    await setSessionCookie(user, false);
    return redirectTo(request, "/library");
  } catch {
    return redirectTo(request, "/?error=steam_auth_error");
  }
}
