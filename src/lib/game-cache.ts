/**
 * Browser-side cache for playable session slices.
 *
 * Legitimate AAA titles do not install full Windows binaries into the browser.
 * Playcache keeps a bounded session slice (codecs, input remaps, shaders, UI,
 * and progressive stream buffers) in Cache Storage + IndexedDB. The game itself
 * runs on ownership-checked stream nodes; only owned Steam titles can start.
 */

const CACHE_NAME = "playcache-v1";
const DB_NAME = "playcache-meta";
const DB_STORE = "sessions";

export type CacheProgress = {
  appId: number;
  bytesStored: number;
  bytesTarget: number;
  ready: boolean;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "appId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putMeta(progress: CacheProgress): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(progress);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getCacheProgress(
  appId: number,
): Promise<CacheProgress | null> {
  const db = await openDb();
  const result = await new Promise<CacheProgress | null>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(appId);
    req.onsuccess = () => resolve((req.result as CacheProgress) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearGameCache(appId: number): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((r) => r.url.includes(`/game-slice/${appId}/`))
      .map((r) => cache.delete(r)),
  );
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(appId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Downloads a playable slice into Cache Storage in chunks.
 * Uses synthetic payloads so the demo works without shipping proprietary game files.
 */
export async function ensurePlayableSlice(
  appId: number,
  targetMb: number,
  onProgress: (p: CacheProgress) => void,
  signal?: AbortSignal,
): Promise<CacheProgress> {
  const existing = await getCacheProgress(appId);
  const targetBytes = Math.max(1, Math.round(targetMb * 1024 * 1024));
  if (existing?.ready && existing.bytesTarget === targetBytes) {
    onProgress(existing);
    return existing;
  }

  const cache = await caches.open(CACHE_NAME);
  const chunkSize = 1024 * 1024;
  let stored = existing?.bytesStored ?? 0;

  // Resume: skip already-cached chunk URLs.
  while (stored < targetBytes) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const next = Math.min(chunkSize, targetBytes - stored);
    const chunkIndex = Math.floor(stored / chunkSize);
    const url = `/game-slice/${appId}/chunk-${chunkIndex}.bin`;

    const hit = await cache.match(url);
    if (!hit) {
      // Fill with deterministic pseudo-binary so Cache Storage holds real bytes.
      const bytes = new Uint8Array(next);
      for (let i = 0; i < next; i++) {
        bytes[i] = (i + appId + chunkIndex) % 251;
      }
      await cache.put(
        url,
        new Response(bytes, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        }),
      );
    }

    stored += next;
    const progress: CacheProgress = {
      appId,
      bytesStored: stored,
      bytesTarget: targetBytes,
      ready: stored >= targetBytes,
      updatedAt: Date.now(),
    };
    await putMeta(progress);
    onProgress(progress);
    // Yield so the UI can paint between chunks.
    await new Promise((r) => setTimeout(r, 0));
  }

  const done: CacheProgress = {
    appId,
    bytesStored: targetBytes,
    bytesTarget: targetBytes,
    ready: true,
    updatedAt: Date.now(),
  };
  await putMeta(done);
  onProgress(done);
  return done;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
