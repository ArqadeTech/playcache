import { NextResponse } from "next/server";
import { searchCurseMods } from "@/lib/curseforge";
import type { ModLoader } from "@/lib/minecraft";
import { MC_VERSIONS } from "@/lib/minecraft";

const LOADERS = new Set<ModLoader>(["forge", "fabric", "neoforge", "quilt"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("version") ?? "1.20.1";
  const loader = (searchParams.get("loader") ?? "forge") as ModLoader;
  const query = searchParams.get("q") ?? "";

  if (!MC_VERSIONS.some((v) => v.id === version)) {
    return NextResponse.json({ error: "Unsupported Minecraft version" }, { status: 400 });
  }
  if (!LOADERS.has(loader)) {
    return NextResponse.json({ error: "Unsupported mod loader" }, { status: 400 });
  }

  const versionMeta = MC_VERSIONS.find((v) => v.id === version)!;
  if (!versionMeta.loaders.includes(loader)) {
    return NextResponse.json(
      { error: `${loader} is not available for ${version}` },
      { status: 400 },
    );
  }

  try {
    const result = await searchCurseMods({ version, loader, query });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "CurseForge error" },
      { status: 502 },
    );
  }
}
