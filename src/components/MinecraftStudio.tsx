"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  estimatePackCacheMb,
  LOADER_LABELS,
  MC_VERSIONS,
  type ModLoader,
  type PackMod,
} from "@/lib/minecraft";

type SearchResponse = {
  mods?: PackMod[];
  demo?: boolean;
  note?: string | null;
  error?: string;
};

const PACK_KEY = "playcache-mc-pack";

function readSavedPack(): {
  version: string;
  loader: ModLoader;
  mods: PackMod[];
} {
  const fallback = {
    version: "1.20.1",
    loader: "forge" as ModLoader,
    mods: [] as PackMod[],
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PACK_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as {
      version?: string;
      loader?: ModLoader;
      mods?: PackMod[];
    };
    const version = MC_VERSIONS.some((v) => v.id === parsed.version)
      ? (parsed.version as string)
      : fallback.version;
    const versionMeta = MC_VERSIONS.find((v) => v.id === version)!;
    const loader =
      parsed.loader && versionMeta.loaders.includes(parsed.loader)
        ? parsed.loader
        : versionMeta.loaders[0];
    return { version, loader, mods: parsed.mods ?? [] };
  } catch {
    return fallback;
  }
}

export function MinecraftStudio() {
  const saved = useMemo(() => readSavedPack(), []);
  const [version, setVersion] = useState(saved.version);
  const [loader, setLoader] = useState<ModLoader>(saved.loader);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [mods, setMods] = useState<PackMod[]>([]);
  const [pack, setPack] = useState<PackMod[]>(saved.mods);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const versionMeta = MC_VERSIONS.find((v) => v.id === version)!;
  const loaders = versionMeta.loaders;
  const activeLoader = loaders.includes(loader) ? loader : loaders[0];

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      version,
      loader: activeLoader,
      q: deferredQuery,
    });
    fetch(`/api/minecraft/mods?${params}`, { signal: controller.signal })
      .then(async (r) => {
        const json = (await r.json()) as SearchResponse;
        if (!r.ok) throw new Error(json.error || "Search failed");
        return json;
      })
      .then((json) => {
        startTransition(() => {
          setMods(json.mods ?? []);
          setNote(json.note ?? null);
          setError(null);
          setLoading(false);
        });
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        startTransition(() => {
          setError(err.message);
          setLoading(false);
        });
      });
    return () => controller.abort();
  }, [version, activeLoader, deferredQuery]);

  useEffect(() => {
    localStorage.setItem(
      PACK_KEY,
      JSON.stringify({ version, loader: activeLoader, mods: pack }),
    );
  }, [version, activeLoader, pack]);

  const packIds = useMemo(() => new Set(pack.map((m) => m.id)), [pack]);
  const cacheMb = estimatePackCacheMb({
    version,
    loader: activeLoader,
    mods: pack,
  });

  function onVersionChange(next: string) {
    const meta = MC_VERSIONS.find((v) => v.id === next)!;
    setVersion(next);
    if (!meta.loaders.includes(loader)) {
      setLoader(meta.loaders[0]);
    }
    setLoading(true);
  }

  function onLoaderChange(next: ModLoader) {
    setLoader(next);
    setLoading(true);
  }

  function addMod(mod: PackMod) {
    if (packIds.has(mod.id)) return;
    setPack((prev) => [...prev, mod]);
  }

  function removeMod(id: number) {
    setPack((prev) => prev.filter((m) => m.id !== id));
  }

  const playHref = `/minecraft/play?version=${encodeURIComponent(version)}&loader=${activeLoader}`;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block min-w-[8rem]">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Minecraft version
            </span>
            <select
              value={version}
              onChange={(e) => onVersionChange(e.target.value)}
              className="mt-1 w-full rounded-sm border border-line bg-panel px-3 py-2 text-sm text-paper outline-none focus:border-signal"
            >
              {MC_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-[8rem]">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Mod loader
            </span>
            <select
              value={activeLoader}
              onChange={(e) => onLoaderChange(e.target.value as ModLoader)}
              className="mt-1 w-full rounded-sm border border-line bg-panel px-3 py-2 text-sm text-paper outline-none focus:border-signal"
            >
              {loaders.map((l) => (
                <option key={l} value={l}>
                  {LOADER_LABELS[l]}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-[14rem] flex-1">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Search CurseForge
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLoading(true);
              }}
              placeholder="JEI, Create, Sodium…"
              className="mt-1 w-full rounded-sm border border-line bg-panel px-3 py-2 text-sm text-paper outline-none placeholder:text-fog/60 focus:border-signal"
            />
          </label>
        </div>

        {note ? (
          <p className="mt-4 rounded-sm border border-line bg-panel/60 px-4 py-3 text-sm text-fog">
            {note}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {loading || pending ? (
            <li className="font-mono text-sm text-fog">Loading mods…</li>
          ) : mods.length === 0 ? (
            <li className="text-sm text-fog">No mods matched this version / loader.</li>
          ) : (
            mods.map((mod) => (
              <li
                key={mod.id}
                className="flex gap-3 rounded-sm border border-line bg-panel/40 p-3"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-ink-elevated">
                  {mod.logoUrl ? (
                    <Image
                      src={mod.logoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-signal">
                      CF
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="truncate font-semibold tracking-tight">{mod.name}</h2>
                    <span className="font-mono text-[10px] text-fog">
                      {mod.fileSizeMb} MB · {formatCount(mod.downloadCount)} dl
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-fog">{mod.summary}</p>
                  <p className="mt-1 font-mono text-[11px] text-fog/80">
                    by {mod.author}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    disabled={packIds.has(mod.id)}
                    onClick={() => addMod(mod)}
                    className="btn-signal !px-3 !py-2 text-xs disabled:opacity-40"
                  >
                    {packIds.has(mod.id) ? "Added" : "Add"}
                  </button>
                  <a
                    href={mod.curseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost !px-3 !py-2 text-center text-xs"
                  >
                    CurseForge
                  </a>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <aside className="h-fit rounded-sm border border-line bg-panel/50 p-5 lg:sticky lg:top-6">
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Your pack
        </h2>
        <p className="mt-2 text-sm text-fog leading-relaxed">
          {LOADER_LABELS[activeLoader]} · Minecraft {version}. Mods resolve from
          CurseForge; the playable session slice caches in this browser.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="rounded-sm border border-line bg-ink/40 p-3">
            <dt className="text-fog">Mods</dt>
            <dd className="mt-1 text-paper">{pack.length}</dd>
          </div>
          <div className="rounded-sm border border-line bg-ink/40 p-3">
            <dt className="text-fog">Cache slice</dt>
            <dd className="mt-1 text-paper">~{cacheMb} MB</dd>
          </div>
        </dl>

        <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
          {pack.length === 0 ? (
            <li className="text-sm text-fog">Add mods from the list.</li>
          ) : (
            pack.map((mod) => (
              <li
                key={mod.id}
                className="flex items-center justify-between gap-2 rounded-sm border border-line/70 px-3 py-2 text-sm"
              >
                <span className="truncate">{mod.name}</span>
                <button
                  type="button"
                  onClick={() => removeMod(mod.id)}
                  className="font-mono text-[11px] text-ember hover:underline"
                >
                  remove
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={playHref}
            className="btn-signal w-full text-center"
            onClick={() => {
              localStorage.setItem(
                PACK_KEY,
                JSON.stringify({ version, loader: activeLoader, mods: pack }),
              );
            }}
          >
            Cache pack & play
          </Link>
          <button
            type="button"
            className="btn-ghost w-full text-sm"
            onClick={() => setPack([])}
          >
            Clear pack
          </button>
        </div>
      </aside>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
