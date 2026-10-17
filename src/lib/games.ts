import type { GameEntry } from "./types";

/** Curated catalog used for demo mode and header art. Ownership is verified via Steam when configured. */
export const CATALOG: GameEntry[] = [
  {
    appId: 271590,
    name: "Grand Theft Auto V",
    playtimeForever: 0,
    imgIconUrl: null,
    headerImage:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg",
    installSizeGb: 110,
    // Demo keeps slices small so Cache Storage stays within typical quotas.
    cacheSliceMb: 24,
    owned: true,
    mode: "stream",
  },
  {
    appId: 730,
    name: "Counter-Strike 2",
    playtimeForever: 0,
    imgIconUrl: null,
    headerImage:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
    installSizeGb: 85,
    cacheSliceMb: 20,
    owned: true,
    mode: "stream",
  },
  {
    appId: 1245620,
    name: "ELDEN RING",
    playtimeForever: 0,
    imgIconUrl: null,
    headerImage:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
    installSizeGb: 60,
    cacheSliceMb: 22,
    owned: true,
    mode: "stream",
  },
  {
    appId: 1174180,
    name: "Red Dead Redemption 2",
    playtimeForever: 0,
    imgIconUrl: null,
    headerImage:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
    installSizeGb: 150,
    cacheSliceMb: 28,
    owned: true,
    mode: "stream",
  },
  {
    appId: 1091500,
    name: "Cyberpunk 2077",
    playtimeForever: 0,
    imgIconUrl: null,
    headerImage:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
    installSizeGb: 70,
    cacheSliceMb: 24,
    owned: true,
    mode: "stream",
  },
  {
    appId: 570,
    name: "Dota 2",
    playtimeForever: 0,
    imgIconUrl: null,
    headerImage:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
    installSizeGb: 60,
    cacheSliceMb: 18,
    owned: true,
    mode: "stream",
  },
  {
    appId: 1,
    name: "Orbit Drift",
    playtimeForever: 12,
    imgIconUrl: null,
    headerImage: "/games/orbit-drift.svg",
    installSizeGb: 0.04,
    cacheSliceMb: 4,
    owned: true,
    mode: "native-demo",
  },
];

export function getCatalogGame(appId: number): GameEntry | undefined {
  return CATALOG.find((g) => g.appId === appId);
}

export function mergeOwnedLibrary(
  ownedAppIds: Set<number>,
  steamGames: Array<{
    appid: number;
    name: string;
    playtime_forever: number;
    img_icon_url?: string;
  }>,
): GameEntry[] {
  const byId = new Map(CATALOG.map((g) => [g.appId, g]));
  const merged: GameEntry[] = [];

  for (const g of steamGames) {
    const known = byId.get(g.appid);
    if (known) {
      merged.push({
        ...known,
        name: g.name || known.name,
        playtimeForever: g.playtime_forever,
        imgIconUrl: g.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          : null,
        owned: true,
      });
    } else if (ownedAppIds.has(g.appid)) {
      merged.push({
        appId: g.appid,
        name: g.name,
        playtimeForever: g.playtime_forever,
        imgIconUrl: g.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          : null,
        headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        installSizeGb: 40,
        cacheSliceMb: 20,
        owned: true,
        mode: "stream",
      });
    }
  }

  // Always include the native demo so the cache flow is tryable without a GPU farm.
  const demo = byId.get(1);
  if (demo && !merged.some((g) => g.appId === 1)) {
    merged.unshift(demo);
  }

  return merged.sort((a, b) => b.playtimeForever - a.playtimeForever);
}

export function demoLibrary(): GameEntry[] {
  return CATALOG.map((g) => ({ ...g, owned: true }));
}
