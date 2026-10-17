"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ensureModpackSlice,
  formatBytes,
  type ModpackProgress,
} from "@/lib/modpack-cache";
import {
  estimatePackCacheMb,
  LOADER_LABELS,
  type ModLoader,
  type PackMod,
} from "@/lib/minecraft";
import { VoxelDriftGame } from "./VoxelDriftGame";

const PACK_KEY = "playcache-mc-pack";

type Phase = "checking" | "caching" | "ready" | "playing" | "error";

export function MinecraftPlaySession({
  version,
  loader,
}: {
  version: string;
  loader: ModLoader;
}) {
  const [mods] = useState<PackMod[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(PACK_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as { mods?: PackMod[] })
        : null;
      return parsed?.mods ?? [];
    } catch {
      return [];
    }
  });
  const [phase, setPhase] = useState<Phase>("checking");
  const [progress, setProgress] = useState<ModpackProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const config = { version, loader, mods };
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        setPhase("caching");
        const result = await ensureModpackSlice(
          config,
          (p) => setProgress(p),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setProgress(result);
          setPhase("ready");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessage("Could not write the modpack slice to browser cache.");
        setPhase("error");
      }
    })();

    return () => controller.abort();
  }, [version, loader, mods]);

  const pct = progress
    ? Math.min(100, Math.round((progress.bytesStored / progress.bytesTarget) * 100))
    : 0;
  const packMods = mods;
  const cacheMb = estimatePackCacheMb({ version, loader, mods: packMods });

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
      <Link href="/minecraft" className="text-sm text-fog hover:text-paper">
        ← Minecraft studio
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative aspect-video overflow-hidden rounded-sm bg-ink-elevated">
          {phase === "playing" ? (
            <div className="absolute inset-0 flex flex-col">
              <div className="relative flex-1">
                <VoxelDriftGame />
              </div>
              <div className="border-t border-line bg-ink/90 px-4 py-2 font-mono text-[11px] text-fog">
                Preview world · full Java + mods run on an ownership-checked play node
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(47,158,104,0.25),transparent_45%),linear-gradient(180deg,#0d1c18,#07110f)] p-6 text-center">
              <div className="mb-6 grid grid-cols-4 gap-1 opacity-80" aria-hidden>
                {Array.from({ length: 16 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded-[2px]"
                    style={{
                      background:
                        i % 3 === 0
                          ? "var(--signal)"
                          : i % 2 === 0
                            ? "var(--signal-deep)"
                            : "#1a4a2e",
                      opacity: 0.35 + (i % 5) * 0.1,
                    }}
                  />
                ))}
              </div>
              {phase === "caching" || phase === "checking" ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
                    Caching modpack slice
                  </p>
                  <p className="mt-3 text-2xl font-bold tracking-tight">{pct}%</p>
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
                    Pack ready in browser cache
                  </p>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setPhase("playing"))}
                    className="btn-signal mt-5 animate-[pulse-glow_2s_ease-in-out_infinite]"
                  >
                    Enter world
                  </button>
                </>
              ) : (
                <p className="text-danger">{message ?? "Something went wrong"}</p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div>
            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Minecraft {version}
            </h1>
            <p className="mt-2 text-sm text-fog leading-relaxed">
              {LOADER_LABELS[loader]} pack with {packMods.length} CurseForge mod
              {packMods.length === 1 ? "" : "s"}. Java edition binaries stay on the
              play node — this browser keeps the modpack manifest and session
              slice only.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Loader</dt>
              <dd className="mt-1">{LOADER_LABELS[loader]}</dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Cache slice</dt>
              <dd className="mt-1">~{cacheMb} MB</dd>
            </div>
          </dl>

          <ul className="max-h-48 space-y-1 overflow-auto font-mono text-xs text-fog">
            {packMods.length === 0 ? (
              <li>Vanilla slice (no mods selected).</li>
            ) : (
              packMods.map((m) => (
                <li key={m.id} className="truncate text-paper/90">
                  {m.name}
                </li>
              ))
            )}
          </ul>

          <Link href="/minecraft" className="btn-ghost inline-flex w-full justify-center text-sm">
            Edit pack
          </Link>
        </aside>
      </div>
    </div>
  );
}
