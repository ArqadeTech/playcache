import { NextResponse } from "next/server";
import { demoLibrary, mergeOwnedLibrary } from "@/lib/games";
import { getSession } from "@/lib/session";
import { fetchOwnedGames, steamConfigured } from "@/lib/steam";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.demo || !steamConfigured()) {
    return NextResponse.json({
      demo: true,
      games: demoLibrary(),
      note: "Demo library — connect a Steam API key for live ownership checks.",
    });
  }

  try {
    const owned = await fetchOwnedGames(session.user.steamId);
    const ownedIds = new Set(owned.map((g) => g.appid));
    const games = mergeOwnedLibrary(ownedIds, owned);
    return NextResponse.json({
      demo: false,
      games,
      note: null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load Steam library" },
      { status: 502 },
    );
  }
}
