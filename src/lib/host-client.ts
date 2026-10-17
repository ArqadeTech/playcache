import type { RemoteHostConfig } from "./remote-host";

export function httpBase(endpoint: string): string {
  return endpoint
    .trim()
    .replace(/^ws:/i, "http:")
    .replace(/^wss:/i, "https:")
    .replace(/\/$/, "");
}

export function wsBase(endpoint: string): string {
  const http = httpBase(endpoint);
  if (http.startsWith("https:")) return http.replace(/^https:/, "wss:");
  return http.replace(/^http:/, "ws:");
}

export function mjpegUrl(config: RemoteHostConfig): string {
  const base = httpBase(config.endpoint);
  const token = config.token
    ? `?token=${encodeURIComponent(config.token)}`
    : "";
  return `${base}/mjpeg${token}`;
}

export function controlWsUrl(config: RemoteHostConfig): string {
  const base = wsBase(config.endpoint);
  const token = config.token
    ? `?token=${encodeURIComponent(config.token)}`
    : "";
  return `${base}/control${token}`;
}

export type HostInputMessage =
  | { type: "keydown" | "keyup"; code: string; key?: string }
  | { type: "mousemove"; x: number; y: number }
  | { type: "mousedown" | "mouseup"; button: number }
  | { type: "click" };

type Listener = (msg: HostInputMessage) => void;

const listeners = new Set<Listener>();

/** Global bus so mobile overlay + keyboard both reach the active host socket. */
export function publishHostInput(msg: HostInputMessage): void {
  for (const l of listeners) l(msg);
}

export function subscribeHostInput(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hostLaunch(
  config: RemoteHostConfig,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; message?: string; mode?: string; error?: string }> {
  const res = await fetch(`${httpBase(config.endpoint)}/launch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function hostSyncMods(
  config: RemoteHostConfig,
  files: unknown[],
): Promise<{ ok: boolean; installed?: unknown[]; error?: string }> {
  const res = await fetch(`${httpBase(config.endpoint)}/mods/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
    },
    body: JSON.stringify({ files }),
  });
  return res.json();
}
