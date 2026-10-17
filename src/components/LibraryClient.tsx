"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { GameEntry } from "@/lib/types";

type LibraryResponse = {
  games?: GameEntry[];
  demo?: boolean;
  note?: string | null;
  error?: string;
};

export function LibraryClient() {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/library")
      .then(async (r) => {
        if (r.status === 401) {
          if (!cancelled) setNeedsAuth(true);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (!cancelled && json) {
          if (json.error) setError(json.error);
          else setData(json);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load library");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (needsAuth) {
    return (
      <div className="rounded-md border border-line bg-panel/60 px-5 py-6">
        <p className="text-fog">Sign in to load your Steam-owned library.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/api/auth/steam" className="btn-signal !py-2 !px-3 text-sm">
            Connect Steam
          </a>
          <a href="/api/auth/steam?demo=1" className="btn-ghost !py-2 !px-3 text-sm">
            Try demo library
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-danger" role="alert">
        {error}
      </p>
    );
  }

  if (!data?.games) {
    return (
      <p className="font-mono text-sm text-fog" aria-live="polite">
        Syncing Steam library…
      </p>
    );
  }

  return (
    <div>
      {data.note ? (
        <p className="mb-6 rounded-md border border-line bg-panel/60 px-4 py-3 text-sm text-fog">
          {data.note}
        </p>
      ) : null}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.games.map((game, index) => (
          <li
            key={game.appId}
            className="group animate-rise"
            style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
          >
            <Link href={`/play/${game.appId}`} className="block outline-none">
              <div className="relative aspect-[460/215] overflow-hidden rounded-sm bg-panel">
                <Image
                  src={game.headerImage}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized={game.headerImage.startsWith("/")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-lg font-bold tracking-tight">{game.name}</h2>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-signal">
                    {game.mode === "native-demo"
                      ? "Browser demo"
                      : `Stream · ${game.cacheSliceMb} MB cache slice`}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
