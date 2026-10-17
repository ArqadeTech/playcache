"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  clearGameCache,
  ensurePlayableSlice,
  formatBytes,
  getCacheProgress,
  type CacheProgress,
} from "@/lib/game-cache";
import type { GameEntry } from "@/lib/types";
import { OrbitDriftGame } from "./OrbitDriftGame";

type Phase = "checking" | "caching" | "ready" | "playing" | "error";

export function PlaySession({ game }: { game: GameEntry }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [progress, setProgress] = useState<CacheProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const existing = await getCacheProgress(game.appId);
        if (existing?.ready) {
          setProgress(existing);
          setPhase("ready");
          return;
        }
        setPhase("caching");
        const result = await ensurePlayableSlice(
          game.appId,
          game.cacheSliceMb,
          (p) => setProgress(p),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setProgress(result);
          setPhase("ready");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessage("Cache write failed — check browser storage permissions.");
        setPhase("error");
      }
    })();

    return () => controller.abort();
  }, [game.appId, game.cacheSliceMb]);

  const pct = progress
    ? Math.min(100, Math.round((progress.bytesStored / progress.bytesTarget) * 100))
    : 0;

  function startPlay() {
    startTransition(() => setPhase("playing"));
  }

  async function resetCache() {
    await clearGameCache(game.appId);
    setProgress(null);
    setPhase("caching");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await ensurePlayableSlice(
        game.appId,
        game.cacheSliceMb,
        (p) => setProgress(p),
        controller.signal,
      );
      setProgress(result);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
      <Link href="/library" className="text-sm text-fog hover:text-paper">
        ← Library
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-sm bg-ink-elevated">
            {phase === "playing" ? (
              game.mode === "native-demo" ? (
                <OrbitDriftGame />
              ) : (
                <StreamStage game={game} />
              )
            ) : (
              <>
                <Image
                  src={game.headerImage}
                  alt=""
                  fill
                  className="object-cover opacity-60"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  unoptimized={game.headerImage.startsWith("/")}
                  priority
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/55 p-6 text-center">
                  {phase === "caching" || phase === "checking" ? (
                    <>
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
                        Writing browser cache
                      </p>
                      <p className="mt-3 text-2xl font-bold tracking-tight">
                        {pct}%
                      </p>
                      <div className="cache-bar mt-5 w-full max-w-sm">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-3 font-mono text-xs text-fog">
                        {progress
                          ? `${formatBytes(progress.bytesStored)} / ${formatBytes(progress.bytesTarget)}`
                          : "Preparing…"}
                      </p>
                    </>
                  ) : phase === "ready" ? (
                    <>
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
                        Session slice ready
                      </p>
                      <button
                        type="button"
                        onClick={startPlay}
                        className="btn-signal mt-5 animate-[pulse-glow_2s_ease-in-out_infinite]"
                      >
                        Play now
                      </button>
                    </>
                  ) : (
                    <p className="text-danger">{message ?? "Something went wrong"}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div>
            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              {game.name}
            </h1>
            <p className="mt-2 text-sm text-fog leading-relaxed">
              {game.mode === "native-demo"
                ? "This title runs entirely in your browser after the cache slice is written."
                : "Ownership-checked stream. The full install stays on the play node; your browser holds the session slice only."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Install (Steam)</dt>
              <dd className="mt-1 text-paper">{game.installSizeGb} GB</dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Browser cache</dt>
              <dd className="mt-1 text-paper">{game.cacheSliceMb} MB</dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Mode</dt>
              <dd className="mt-1 text-paper">
                {game.mode === "native-demo" ? "Native demo" : "Secure stream"}
              </dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Network</dt>
              <dd className="mt-1 text-paper">25+ Mbps recommended</dd>
            </div>
          </dl>

          <button type="button" onClick={resetCache} className="btn-ghost w-full text-sm">
            Clear cache & re-download slice
          </button>
        </aside>
      </div>
    </div>
  );
}

function StreamStage({ game }: { game: GameEntry }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#050c0a]">
      <div
        className="relative flex-1"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(5,12,10,0.35), rgba(5,12,10,0.85)), url(${game.headerImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-md px-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
              Live stream session
            </p>
            <p className="mt-3 text-lg font-semibold leading-snug">
              Connected to an ownership-checked play node for {game.name}.
            </p>
            <p className="mt-3 text-sm text-fog leading-relaxed">
              In production this surface is a WebRTC / low-latency video feed with
              keyboard and gamepad remoting. This deployable build proves the
              Steam + browser-cache flow without shipping proprietary game
              binaries.
            </p>
            <div className="mx-auto mt-6 cache-bar w-48">
              <span style={{ width: "100%" }} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-fog">
              Input latency probe · cache hit · slice warm
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[11px] text-fog">
        <span>bitrate adaptive</span>
        <span>steam owned</span>
        <span>cache local</span>
      </div>
    </div>
  );
}
