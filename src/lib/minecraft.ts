export type ModLoader = "forge" | "fabric" | "neoforge" | "quilt";

export type McVersion = {
  id: string;
  label: string;
  loaders: ModLoader[];
};

/** Common Java editions players still build packs for. Not a redistributed client. */
export const MC_VERSIONS: McVersion[] = [
  { id: "1.21.1", label: "1.21.1", loaders: ["neoforge", "fabric", "forge"] },
  { id: "1.21", label: "1.21", loaders: ["neoforge", "fabric", "forge"] },
  { id: "1.20.4", label: "1.20.4", loaders: ["neoforge", "fabric", "forge"] },
  { id: "1.20.1", label: "1.20.1", loaders: ["forge", "fabric", "neoforge"] },
  { id: "1.19.2", label: "1.19.2", loaders: ["forge", "fabric", "quilt"] },
  { id: "1.18.2", label: "1.18.2", loaders: ["forge", "fabric", "quilt"] },
  { id: "1.16.5", label: "1.16.5", loaders: ["forge", "fabric"] },
  { id: "1.12.2", label: "1.12.2", loaders: ["forge"] },
];

export const LOADER_LABELS: Record<ModLoader, string> = {
  forge: "Forge",
  fabric: "Fabric",
  neoforge: "NeoForge",
  quilt: "Quilt",
};

/** CurseForge ModLoaderType enum */
export const LOADER_CF_ID: Record<ModLoader, number> = {
  forge: 1,
  fabric: 4,
  quilt: 5,
  neoforge: 6,
};

export const MC_GAME_ID = 432;
/** CurseForge classId for Minecraft Mods */
export const MC_MODS_CLASS_ID = 6;

export type PackMod = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  author: string;
  logoUrl: string | null;
  downloadCount: number;
  fileSizeMb: number;
  curseUrl: string;
};

export type ModpackConfig = {
  version: string;
  loader: ModLoader;
  mods: PackMod[];
};

export function estimatePackCacheMb(pack: ModpackConfig): number {
  const mods = pack.mods.reduce((sum, m) => sum + m.fileSizeMb, 0);
  // Loader + session slice overhead (not a full Minecraft install).
  return Math.max(8, Math.round(mods + 12));
}

export function packId(pack: ModpackConfig): string {
  const modKey = pack.mods
    .map((m) => m.id)
    .sort((a, b) => a - b)
    .join("-");
  return `mc-${pack.version}-${pack.loader}-${modKey || "vanilla"}`;
}
