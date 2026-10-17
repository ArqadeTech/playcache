"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import {
  type HostConnectionState,
  probeRemoteHost,
  readRemoteHost,
  type RemoteHostConfig,
  writeRemoteHost,
} from "@/lib/remote-host";
import {
  readMobilePref,
  writeMobilePref,
  type MobilePref,
} from "@/lib/mobile-controls";
import { VoxelDriftGame } from "./VoxelDriftGame";
import { MinecraftMobileOverlay } from "./MinecraftMobileOverlay";
import { RemotePlayView } from "./RemotePlayView";

const PACK_KEY = "playcache-mc-pack";

type Phase = "checking" | "caching" | "ready" | "playing" | "error";

type ResolvedFile = {
  slug: string;
  title: string;
  filename: string;
  url: string;
  size: number;
  versionNumber: string;
};

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
      const parsed = raw ? (JSON.parse(raw) as { mods?: PackMod[] }) : null;
      return parsed?.mods ?? [];
    } catch {
      return [];
    }
  });
  const [host, setHost] = useState<RemoteHostConfig>(() => {
    const saved = readRemoteHost();
    // Prefer live remote play — enable by default if never configured.
    if (!saved.enabled && saved.endpoint.includes("127.0.0.1")) {
      const next = { ...saved, enabled: true };
      writeRemoteHost(next);
      return next;
    }
    return saved;
  });
  const [mobilePref, setMobilePref] = useState<MobilePref>(() =>
    readMobilePref(),
  );
  const [isNarrow, setIsNarrow] = useState(false);
  const [hostState, setHostState] = useState<HostConnectionState>("idle");
  const [hostDetail, setHostDetail] = useState("");
  const [phase, setPhase] = useState<Phase>("checking");
  const [progress, setProgress] = useState<ModpackProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [files, setFiles] = useState<ResolvedFile[]>([]);
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const mobileActive = mobilePref.forceMobile || isNarrow;
  const liveRemote = host.enabled && hostState === "connected";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    writeMobilePref(mobilePref);
  }, [mobilePref]);

  useEffect(() => {
    const config = { version, loader, mods };
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        setPhase("caching");

        if (host.enabled) {
          setHostState("connecting");
          const probe = await probeRemoteHost(host, controller.signal);
          if (controller.signal.aborted) return;
          setHostState(probe.state);
          setHostDetail(probe.detail);
        } else {
          setHostState("idle");
          setHostDetail("");
        }

        // Resolve Modrinth download URLs for the host agent.
        if (mods.length) {
          try {
            const res = await fetch("/api/minecraft/resolve-mods", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                version,
                loader,
                slugs: mods.map((m) => m.slug),
              }),
              signal: controller.signal,
            });
            const json = (await res.json()) as {
              files?: ResolvedFile[];
              error?: string;
            };
            if (res.ok) setFiles(json.files ?? []);
          } catch {
            /* optional — host can still stream */
          }
        }

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
        setMessage("Could not prepare the Minecraft session.");
        setPhase("error");
      }
    })();

    return () => controller.abort();
  }, [version, loader, mods, host]);

  const pct = progress
    ? Math.min(
        100,
        Math.round((progress.bytesStored / progress.bytesTarget) * 100),
      )
    : 0;
  const packMods = mods;
  const cacheMb = estimatePackCacheMb({ version, loader, mods: packMods });

  const playFrameClass = useMemo(
    () =>
      mobileActive
        ? "relative aspect-[9/16] max-h-[80vh] overflow-hidden rounded-sm bg-ink-elevated sm:aspect-video sm:max-h-none"
        : "relative aspect-video overflow-hidden rounded-sm bg-ink-elevated",
    [mobileActive],
  );

  function enableHost() {
    const next = { ...host, enabled: true };
    writeRemoteHost(next);
    setHost(next);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
      <Link href="/minecraft" className="text-sm text-fog hover:text-paper">
        ← Minecraft studio
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className={playFrameClass}>
          {phase === "playing" ? (
            <div className="absolute inset-0 flex flex-col">
              <div className="relative flex-1 overflow-hidden">
                {liveRemote ? (
                  <RemotePlayView
                    host={host}
                    version={version}
                    loader={loader}
                    mods={packMods}
                    files={files}
                  />
                ) : host.enabled ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink p-6 text-center">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">
                        Host offline
                      </p>
                      <p className="mt-3 text-sm text-fog leading-relaxed">
                        {hostDetail ||
                          "Start the host agent on your PC, then reload."}
                      </p>
                      <pre className="mt-4 rounded-sm border border-line bg-panel/60 p-3 text-left font-mono text-[11px] text-signal">
                        node host-agent/host-agent.mjs
                      </pre>
                      <div className="mt-4">
                        <VoxelDriftGame />
                      </div>
                    </div>
                  </div>
                ) : (
                  <VoxelDriftGame />
                )}
                <MinecraftMobileOverlay
                  active={mobileActive}
                  showHud={mobilePref.showHud}
                />
              </div>
              <div className="border-t border-line bg-ink/90 px-4 py-2 font-mono text-[11px] text-fog">
                {liveRemote
                  ? `LIVE remote ${host.os} · ${host.name}`
                  : host.enabled
                    ? `Remote ${host.os} · ${hostState}`
                    : "Local preview — enable remote host to stream a real PC"}
                {mobileActive ? " · mobile controls" : ""}
                {files.length ? ` · ${files.length} mod jars` : ""}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(47,158,104,0.25),transparent_45%),linear-gradient(180deg,#0d1c18,#07110f)] p-6 text-center">
              {phase === "caching" || phase === "checking" ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
                    {host.enabled
                      ? "Linking host + resolving Modrinth mods"
                      : "Caching pack slice"}
                  </p>
                  <p className="mt-3 text-2xl font-bold tracking-tight">{pct}%</p>
                  <div className="cache-bar mt-5 w-full max-w-sm">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-3 font-mono text-xs text-fog">
                    {host.enabled && hostState === "connecting"
                      ? "Probing remote host…"
                      : progress
                        ? `${formatBytes(progress.bytesStored)} / ${formatBytes(progress.bytesTarget)}`
                        : "Preparing…"}
                  </p>
                </>
              ) : phase === "ready" ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
                    {liveRemote
                      ? "Remote host connected"
                      : host.enabled
                        ? "Host not reachable"
                        : "Ready"}
                  </p>
                  {hostDetail ? (
                    <p className="mt-2 max-w-sm text-xs text-fog">{hostDetail}</p>
                  ) : null}
                  {files.length ? (
                    <p className="mt-2 font-mono text-[11px] text-signal">
                      {files.length} Modrinth file
                      {files.length === 1 ? "" : "s"} resolved for install
                    </p>
                  ) : null}
                  {!host.enabled ? (
                    <button
                      type="button"
                      onClick={enableHost}
                      className="btn-ghost mt-4 text-sm"
                    >
                      Enable remote host (required for real Minecraft)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startTransition(() => setPhase("playing"))}
                    className="btn-signal mt-5 animate-[pulse-glow_2s_ease-in-out_infinite]"
                  >
                    {liveRemote ? "Connect & play" : "Enter session"}
                  </button>
                </>
              ) : (
                <p className="text-danger">
                  {message ?? "Something went wrong"}
                </p>
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
              {LOADER_LABELS[loader]} pack with {packMods.length} Modrinth mod
              {packMods.length === 1 ? "" : "s"}.
              {liveRemote
                ? ` Live stream from ${host.name} (${host.os}).`
                : " Start host-agent on your PC to stream the real game."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Mode</dt>
              <dd className="mt-1">
                {liveRemote ? `LIVE · ${host.os}` : host.enabled ? hostState : "preview"}
              </dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Cache slice</dt>
              <dd className="mt-1">~{cacheMb} MB</dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Mod jars</dt>
              <dd className="mt-1">{files.length}</dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Controls</dt>
              <dd className="mt-1">
                {mobileActive ? "Mobile HUD" : "Keyboard"}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 rounded-sm border border-line bg-panel/40 p-3">
            <p className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Mobile (Minecraft only)
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-[var(--signal)]"
                checked={mobilePref.forceMobile}
                onChange={(e) =>
                  setMobilePref((p) => ({
                    ...p,
                    forceMobile: e.target.checked,
                  }))
                }
              />
              Show on-screen controller
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-[var(--signal)]"
                checked={mobilePref.showHud}
                onChange={(e) =>
                  setMobilePref((p) => ({ ...p, showHud: e.target.checked }))
                }
              />
              Show game HUD (hotbar / hearts)
            </label>
          </div>

          <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs text-fog">
            {packMods.length === 0 ? (
              <li>No mods selected.</li>
            ) : (
              packMods.map((m) => (
                <li key={m.id} className="truncate text-paper/90">
                  {m.name}
                  {files.some((f) => f.slug === m.slug) ? " · jar ready" : ""}
                </li>
              ))
            )}
          </ul>

          <Link
            href="/minecraft"
            className="btn-ghost inline-flex w-full justify-center text-sm"
          >
            Edit pack / host
          </Link>
        </aside>
      </div>
    </div>
  );
}
