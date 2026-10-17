import {
  LOADER_CF_ID,
  MC_GAME_ID,
  MC_MODS_CLASS_ID,
  type ModLoader,
  type PackMod,
} from "./minecraft";

export function curseConfigured(): boolean {
  return Boolean(process.env.CURSEFORGE_API_KEY);
}

type CfMod = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  downloadCount?: number;
  authors?: Array<{ name: string }>;
  logo?: { thumbnailUrl?: string; url?: string } | null;
  links?: { websiteUrl?: string };
  latestFilesIndexes?: Array<{
    gameVersion: string;
    fileLength?: number;
    modLoader?: number;
  }>;
  latestFiles?: Array<{
    fileLength?: number;
    gameVersions?: string[];
  }>;
};

function mapMod(mod: CfMod, version: string): PackMod {
  const file =
    mod.latestFiles?.find((f) =>
      f.gameVersions?.some((v) => v === version || v.startsWith(version)),
    ) ?? mod.latestFiles?.[0];
  const bytes = file?.fileLength ?? 2_500_000;
  return {
    id: mod.id,
    slug: mod.slug,
    name: mod.name,
    summary: mod.summary ?? "",
    author: mod.authors?.[0]?.name ?? "Unknown",
    logoUrl: mod.logo?.thumbnailUrl || mod.logo?.url || null,
    downloadCount: Math.round(mod.downloadCount ?? 0),
    fileSizeMb: Math.max(0.1, Math.round((bytes / (1024 * 1024)) * 10) / 10),
    curseUrl:
      mod.links?.websiteUrl ||
      `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`,
  };
}

/** Curated demo rows when no CurseForge API key is set. */
const DEMO_MODS: Array<PackMod & { versions: string[]; loaders: ModLoader[] }> =
  [
    {
      id: 238222,
      slug: "jei",
      name: "Just Enough Items (JEI)",
      summary: "Item and recipe viewing for Minecraft.",
      author: "mezz",
      logoUrl: null,
      downloadCount: 250_000_000,
      fileSizeMb: 1.2,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/jei",
      versions: ["1.20.1", "1.19.2", "1.18.2", "1.16.5", "1.12.2", "1.21.1", "1.21", "1.20.4"],
      loaders: ["forge", "fabric", "neoforge", "quilt"],
    },
    {
      id: 328085,
      slug: "create",
      name: "Create",
      summary: "Aesthetic automation with rotating shafts and contraptions.",
      author: "simibubi",
      logoUrl: null,
      downloadCount: 120_000_000,
      fileSizeMb: 8.4,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/create",
      versions: ["1.20.1", "1.19.2", "1.18.2", "1.16.5"],
      loaders: ["forge", "neoforge"],
    },
    {
      id: 394468,
      slug: "sodium",
      name: "Sodium",
      summary: "Modern rendering engine for Fabric — big FPS wins.",
      author: "JellySquid",
      logoUrl: null,
      downloadCount: 90_000_000,
      fileSizeMb: 1.8,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/sodium",
      versions: ["1.21.1", "1.21", "1.20.4", "1.20.1", "1.19.2", "1.18.2"],
      loaders: ["fabric", "quilt"],
    },
    {
      id: 263420,
      slug: "xaeros-minimap",
      name: "Xaero's Minimap",
      summary: "Clean minimap with waypoints and fair-play options.",
      author: "xaero",
      logoUrl: null,
      downloadCount: 180_000_000,
      fileSizeMb: 2.1,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/xaeros-minimap",
      versions: ["1.21.1", "1.21", "1.20.4", "1.20.1", "1.19.2", "1.18.2", "1.16.5", "1.12.2"],
      loaders: ["forge", "fabric", "neoforge", "quilt"],
    },
    {
      id: 243121,
      slug: "quark",
      name: "Quark",
      summary: "Vanilla-feeling enhancements across the whole game.",
      author: "Vazkii",
      logoUrl: null,
      downloadCount: 100_000_000,
      fileSizeMb: 6.5,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/quark",
      versions: ["1.20.1", "1.19.2", "1.18.2", "1.16.5"],
      loaders: ["forge"],
    },
    {
      id: 306612,
      slug: "fabric-api",
      name: "Fabric API",
      summary: "Core library required by most Fabric mods.",
      author: "modmuss50",
      logoUrl: null,
      downloadCount: 200_000_000,
      fileSizeMb: 1.5,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/fabric-api",
      versions: ["1.21.1", "1.21", "1.20.4", "1.20.1", "1.19.2", "1.18.2", "1.16.5"],
      loaders: ["fabric", "quilt"],
    },
    {
      id: 419699,
      slug: "architectury-api",
      name: "Architectury API",
      summary: "Cross-loader API used by many modern mods.",
      author: "shedaniel",
      logoUrl: null,
      downloadCount: 80_000_000,
      fileSizeMb: 1.1,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/architectury-api",
      versions: ["1.21.1", "1.21", "1.20.4", "1.20.1", "1.19.2", "1.18.2"],
      loaders: ["forge", "fabric", "neoforge", "quilt"],
    },
    {
      id: 348521,
      slug: "cloth-config",
      name: "Cloth Config API",
      summary: "Config screens used across Fabric and Forge packs.",
      author: "shedaniel",
      logoUrl: null,
      downloadCount: 150_000_000,
      fileSizeMb: 0.8,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/cloth-config",
      versions: ["1.21.1", "1.21", "1.20.4", "1.20.1", "1.19.2", "1.18.2", "1.16.5"],
      loaders: ["forge", "fabric", "neoforge", "quilt"],
    },
    {
      id: 225643,
      slug: "botania",
      name: "Botania",
      summary: "Tech mod themed around natural magic and flowers.",
      author: "Vazkii",
      logoUrl: null,
      downloadCount: 70_000_000,
      fileSizeMb: 9.2,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/botania",
      versions: ["1.20.1", "1.19.2", "1.18.2", "1.16.5", "1.12.2"],
      loaders: ["forge", "fabric", "neoforge"],
    },
    {
      id: 455508,
      slug: "iris-shaders",
      name: "Iris Shaders",
      summary: "Shader loader for Fabric / Sodium setups.",
      author: "IMS212",
      logoUrl: null,
      downloadCount: 40_000_000,
      fileSizeMb: 3.4,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/iris-shaders",
      versions: ["1.21.1", "1.21", "1.20.4", "1.20.1", "1.19.2"],
      loaders: ["fabric", "quilt"],
    },
    {
      id: 231951,
      slug: "immersive-engineering",
      name: "Immersive Engineering",
      summary: "Powerful tech with a steampunk industrial vibe.",
      author: "BluSunrize",
      logoUrl: null,
      downloadCount: 60_000_000,
      fileSizeMb: 11.0,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/immersive-engineering",
      versions: ["1.20.1", "1.19.2", "1.18.2", "1.16.5", "1.12.2"],
      loaders: ["forge", "neoforge"],
    },
    {
      id: 308702,
      slug: "modmenu",
      name: "Mod Menu",
      summary: "Adds a mods button and config hub on Fabric.",
      author: "Prospector",
      logoUrl: null,
      downloadCount: 110_000_000,
      fileSizeMb: 0.5,
      curseUrl: "https://www.curseforge.com/minecraft/mc-mods/modmenu",
      versions: ["1.21.1", "1.21", "1.20.4", "1.20.1", "1.19.2", "1.18.2", "1.16.5"],
      loaders: ["fabric", "quilt"],
    },
  ];

export function searchDemoMods(
  version: string,
  loader: ModLoader,
  query: string,
): PackMod[] {
  const q = query.trim().toLowerCase();
  return DEMO_MODS.filter(
    (m) =>
      m.versions.includes(version) &&
      m.loaders.includes(loader) &&
      (!q ||
        m.name.toLowerCase().includes(q) ||
        m.slug.includes(q) ||
        m.summary.toLowerCase().includes(q)),
  ).map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    summary: m.summary,
    author: m.author,
    logoUrl: m.logoUrl,
    downloadCount: m.downloadCount,
    fileSizeMb: m.fileSizeMb,
    curseUrl: m.curseUrl,
  }));
}

export async function searchCurseMods(opts: {
  version: string;
  loader: ModLoader;
  query: string;
  pageSize?: number;
}): Promise<{ mods: PackMod[]; demo: boolean; note: string | null }> {
  const key = process.env.CURSEFORGE_API_KEY;
  if (!key) {
    return {
      mods: searchDemoMods(opts.version, opts.loader, opts.query),
      demo: true,
      note: "Demo CurseForge catalog — set CURSEFORGE_API_KEY for live search.",
    };
  }

  const url = new URL("https://api.curseforge.com/v1/mods/search");
  url.searchParams.set("gameId", String(MC_GAME_ID));
  url.searchParams.set("classId", String(MC_MODS_CLASS_ID));
  url.searchParams.set("gameVersion", opts.version);
  url.searchParams.set("modLoaderType", String(LOADER_CF_ID[opts.loader]));
  url.searchParams.set("sortField", "2"); // Popularity
  url.searchParams.set("sortOrder", "desc");
  url.searchParams.set("pageSize", String(opts.pageSize ?? 24));
  if (opts.query.trim()) {
    url.searchParams.set("searchFilter", opts.query.trim());
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "x-api-key": key,
    },
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CurseForge search failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data: CfMod[] };
  return {
    mods: (json.data ?? []).map((m) => mapMod(m, opts.version)),
    demo: false,
    note: null,
  };
}
