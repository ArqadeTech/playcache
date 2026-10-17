import { siteUrl } from "./session";
import type { SteamUser } from "./types";

const OPENID = "https://steamcommunity.com/openid/login";

export function steamConfigured(): boolean {
  return Boolean(process.env.STEAM_API_KEY);
}

export function steamLoginUrl(): string {
  const returnTo = `${siteUrl()}/api/auth/steam/callback`;
  const realm = siteUrl();
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${OPENID}?${params.toString()}`;
}

export function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(
    /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/,
  );
  return match?.[1] ?? null;
}

export async function verifySteamOpenId(
  query: Record<string, string>,
): Promise<string | null> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("openid.")) {
      params.set(key, value);
    }
  }
  params.set("openid.mode", "check_authentication");

  const res = await fetch(OPENID, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await res.text();
  if (!text.includes("is_valid:true")) return null;
  const claimed = query["openid.claimed_id"];
  if (!claimed) return null;
  return extractSteamId(claimed);
}

export async function fetchSteamUser(steamId: string): Promise<SteamUser> {
  const key = process.env.STEAM_API_KEY;
  if (!key) {
    return {
      steamId,
      personaName: `Steam ${steamId.slice(-4)}`,
      avatarUrl: "",
      profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
    };
  }

  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("steamids", steamId);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error("Failed to load Steam profile");
  }
  const data = (await res.json()) as {
    response: {
      players: Array<{
        steamid: string;
        personaname: string;
        avatarfull: string;
        profileurl: string;
      }>;
    };
  };
  const player = data.response.players[0];
  if (!player) {
    throw new Error("Steam profile not found");
  }
  return {
    steamId: player.steamid,
    personaName: player.personaname,
    avatarUrl: player.avatarfull,
    profileUrl: player.profileurl,
  };
}

export async function fetchOwnedGames(steamId: string) {
  const key = process.env.STEAM_API_KEY;
  if (!key) return [];

  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 120 } });
  if (!res.ok) {
    throw new Error("Failed to load Steam library");
  }
  const data = (await res.json()) as {
    response: {
      games?: Array<{
        appid: number;
        name: string;
        playtime_forever: number;
        img_icon_url?: string;
      }>;
    };
  };
  return data.response.games ?? [];
}
