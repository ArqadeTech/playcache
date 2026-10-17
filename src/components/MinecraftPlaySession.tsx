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
} from "@/lib/remote-host";
import {
  readMobilePref,
  writeMobilePref,
  type MobilePref,
} from "@/lib/mobile-controls";
import { VoxelDriftGame } from "./VoxelDriftGame";
import { MinecraftMobileOverlay } from "./MinecraftMobileOverlay";

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
      const parsed = raw ? (JSON.parse(raw) as { mods?: PackMod[] }) : null;
      return parsed?.mods ?? [];
    } catch {
      return [];
    }
  });
  const [host] = useState<RemoteHostConfig>(() => readRemoteHost());
  const [mobilePref, setMobilePref] = useState<MobilePref>(() =>
    readMobilePref(),
  );
  const [isNarrow, setIsNarrow] = useState(false);
  const [hostState, setHostState] = useState<HostConnectionState>("idle");
  const [hostDetail, setHostDetail] = useState("");
  const [phase, setPhase] = useState<Phase>("checking");
  const [progress, setProgress] = useState<ModpackProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const mobileActive = mobilePref.forceMobile || isNarrow;

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
                {host.enabled ? (
                  <RemoteStreamStage
                    host={host}
                    state={hostState}
                    detail={hostDetail}
                  />
                ) : (
                  <VoxelDriftGame />
                )}
                <MinecraftMobileOverlay
                  active={mobileActive}
                  showHud={mobilePref.showHud}
                />
              </div>
              <div className="border-t border-line bg-ink/90 px-4 py-2 font-mono text-[11px] text-fog">
                {host.enabled
                  ? `Remote ${host.os} · ${host.name} · ${hostState}`
                  : "Preview world · cloud play node"}
                {mobileActive ? " · mobile controls" : ""}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(47,158,104,0.25),transparent_45%),linear-gradient(180deg,#0d1c18,#07110f)] p-6 text-center">
              <div
                className="mb-6 grid grid-cols-4 gap-1 opacity-80"
                aria-hidden
              >
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
                    {host.enabled
                      ? "Linking host + caching pack"
                      : "Caching modpack slice"}
                  </p>
                  <p className="mt-3 text-2xl font-bold tracking-tight">
                    {pct}%
                  </p>
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
                    {host.enabled
                      ? hostState === "connected"
                        ? "Remote host ready"
                        : "Demo remote stream ready"
                      : "Pack ready in browser cache"}
                  </p>
                  {host.enabled && hostDetail ? (
                    <p className="mt-2 max-w-sm text-xs text-fog">{hostDetail}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startTransition(() => setPhase("playing"))}
                    className="btn-signal mt-5 animate-[pulse-glow_2s_ease-in-out_infinite]"
                  >
                    Enter world
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
              {LOADER_LABELS[loader]} pack with {packMods.length} CurseForge mod
              {packMods.length === 1 ? "" : "s"}.
              {host.enabled
                ? ` Streaming from your ${host.os} host (${host.name}).`
                : " Java edition stays on the play node; this browser keeps the pack slice."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Mode</dt>
              <dd className="mt-1">
                {host.enabled ? `Remote · ${host.os}` : "Cloud node"}
              </dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Cache slice</dt>
              <dd className="mt-1">~{cacheMb} MB</dd>
            </div>
            <div className="rounded-sm border border-line bg-panel/50 p-3">
              <dt className="text-fog">Host</dt>
              <dd className="mt-1 truncate">
                {host.enabled ? hostState : "n/a"}
              </dd>
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
            <p className="text-xs text-fog">
              Auto-enables on phones. Use Edit controls in-play to drag buttons
              and rebind keys.
            </p>
          </div>

          <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs text-fog">
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

function RemoteStreamStage({
  host,
  state,
  detail,
}: {
  host: RemoteHostConfig;
  state: HostConnectionState;
  detail: string;
}) {
  return (
    <div className="absolute inset-0 bg-[#050c0a]">
      <div className="absolute inset-0">
        <VoxelDriftGame />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/50" />
      <div className="absolute left-3 top-3 z-10 max-w-sm rounded-sm border border-line bg-ink/75 px-3 py-2 backdrop-blur-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
          Remote host · {host.os}
        </p>
        <p className="mt-1 text-sm font-semibold">{host.name}</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-fog">
          {host.endpoint}
        </p>
        <p className="mt-2 text-xs text-fog leading-relaxed">
          {state === "connected"
            ? "Host linked. Video frames + input bridge active (WebRTC swap-in ready)."
            : detail ||
              "Demo remote surface — run the host agent on your PC for a live encode."}
        </p>
      </div>
    </div>
  );
}
