import { NextResponse } from "next/server";
import { resolveModrinthFiles, modrinthConfigured } from "@/lib/modrinth";
import type { ModLoader } from "@/lib/minecraft";
import { MC_VERSIONS } from "@/lib/minecraft";

export async function POST(request: Request) {
  if (!modrinthConfigured()) {
    return NextResponse.json(
      { error: "MODRINTH_TOKEN is not configured on the server" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    version?: string;
    loader?: ModLoader;
    slugs?: string[];
  };

  const version = body.version ?? "1.20.1";
  const loader = body.loader ?? "forge";
  const slugs = body.slugs ?? [];

  if (!MC_VERSIONS.some((v) => v.id === version)) {
    return NextResponse.json({ error: "Unsupported version" }, { status: 400 });
  }
  if (!slugs.length) {
    return NextResponse.json({ files: [] });
  }

  try {
    const files = await resolveModrinthFiles({ slugs, version, loader });
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resolve failed" },
      { status: 502 },
    );
  }
}
