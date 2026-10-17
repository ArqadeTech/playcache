import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PlaySession } from "@/components/PlaySession";
import { getCatalogGame } from "@/lib/games";
import type { GameEntry } from "@/lib/types";

type PageProps = {
  params: Promise<{ appId: string }>;
};

function resolveGame(appId: number): GameEntry | null {
  const known = getCatalogGame(appId);
  if (known) return known;
  if (!Number.isFinite(appId) || appId <= 0) return null;
  return {
    appId,
    name: `Steam App ${appId}`,
    playtimeForever: 0,
    imgIconUrl: null,
    headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    installSizeGb: 40,
    cacheSliceMb: 20,
    owned: true,
    mode: "stream",
  };
}

async function PlayBody({ params }: PageProps) {
  const { appId: raw } = await params;
  const appId = Number(raw);
  const game = resolveGame(appId);
  if (!game) notFound();

  return (
    <>
      <PlaySession game={game} />
      <footer className="border-t border-line px-5 py-6 text-sm text-fog md:px-10">
        <p>
          Need another title?{" "}
          <Link href="/library" className="text-signal hover:underline">
            Back to library
          </Link>
        </p>
      </footer>
    </>
  );
}

export default function PlayPage({ params }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <p className="px-5 py-16 font-mono text-sm text-fog md:px-10">
              Loading session…
            </p>
          }
        >
          <PlayBody params={params} />
        </Suspense>
      </main>
    </div>
  );
}
