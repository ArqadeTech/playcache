import type { ModpackConfig } from "./minecraft";
import { estimatePackCacheMb, packId } from "./minecraft";

const CACHE_NAME = "playcache-mc-v1";
const DB_NAME = "playcache-mc-meta";
const DB_STORE = "packs";

export type ModpackProgress = {
  id: string;
  bytesStored: number;
  bytesTarget: number;
  ready: boolean;
  updatedAt: number;
  config: ModpackConfig;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putMeta(progress: ModpackProgress): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(progress);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getModpackProgress(
  id: string,
): Promise<ModpackProgress | null> {
  const db = await openDb();
  const result = await new Promise<ModpackProgress | null>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () => resolve((req.result as ModpackProgress) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function savePackDraft(config: ModpackConfig): Promise<void> {
  const id = packId(config);
  const existing = await getModpackProgress(id);
  await putMeta({
    id,
    bytesStored: existing?.bytesStored ?? 0,
    bytesTarget: existing?.bytesTarget ?? estimatePackCacheMb(config) * 1024 * 1024,
    ready: existing?.ready ?? false,
    updatedAt: Date.now(),
    config,
  });
}

export async function ensureModpackSlice(
  config: ModpackConfig,
  onProgress: (p: ModpackProgress) => void,
  signal?: AbortSignal,
): Promise<ModpackProgress> {
  const id = packId(config);
  const targetBytes = Math.max(
    1,
    Math.round(estimatePackCacheMb(config) * 1024 * 1024),
  );
  const existing = await getModpackProgress(id);
  if (existing?.ready && existing.bytesTarget === targetBytes) {
    onProgress(existing);
    return existing;
  }

  const cache = await caches.open(CACHE_NAME);
  // Persist the pack manifest itself in cache.
  await cache.put(
    `/mc-pack/${id}/manifest.json`,
    new Response(JSON.stringify(config), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  const chunkSize = 1024 * 1024;
  let stored = existing?.bytesStored ?? 0;

  while (stored < targetBytes) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const next = Math.min(chunkSize, targetBytes - stored);
    const chunkIndex = Math.floor(stored / chunkSize);
    const url = `/mc-pack/${id}/chunk-${chunkIndex}.bin`;
    const hit = await cache.match(url);
    if (!hit) {
      const bytes = new Uint8Array(next);
      for (let i = 0; i < next; i++) {
        bytes[i] = (i + chunkIndex + config.mods.length) % 251;
      }
      await cache.put(
        url,
        new Response(bytes, {
          headers: { "Content-Type": "application/octet-stream" },
        }),
      );
    }
    stored += next;
    const progress: ModpackProgress = {
      id,
      bytesStored: stored,
      bytesTarget: targetBytes,
      ready: stored >= targetBytes,
      updatedAt: Date.now(),
      config,
    };
    await putMeta(progress);
    onProgress(progress);
    await new Promise((r) => setTimeout(r, 0));
  }

  const done: ModpackProgress = {
    id,
    bytesStored: targetBytes,
    bytesTarget: targetBytes,
    ready: true,
    updatedAt: Date.now(),
    config,
  };
  await putMeta(done);
  onProgress(done);
  return done;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
