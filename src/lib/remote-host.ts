export type HostOs = "linux" | "windows";

export type RemoteHostConfig = {
  enabled: boolean;
  os: HostOs;
  name: string;
  /** WebSocket or HTTP base for the host agent, e.g. ws://192.168.1.20:8787 */
  endpoint: string;
  token: string;
};

export type HostConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "demo"
  | "error";

export const REMOTE_HOST_KEY = "playcache-mc-remote-host";

export const DEFAULT_REMOTE_HOST: RemoteHostConfig = {
  enabled: false,
  os: "linux",
  name: "My PC",
  endpoint: "http://127.0.0.1:8787",
  token: "",
};

export function readRemoteHost(): RemoteHostConfig {
  if (typeof window === "undefined") return { ...DEFAULT_REMOTE_HOST };
  try {
    const raw = localStorage.getItem(REMOTE_HOST_KEY);
    if (!raw) return { ...DEFAULT_REMOTE_HOST };
    const parsed = JSON.parse(raw) as Partial<RemoteHostConfig>;
    return {
      ...DEFAULT_REMOTE_HOST,
      ...parsed,
      os: parsed.os === "windows" ? "windows" : "linux",
      enabled: Boolean(parsed.enabled),
    };
  } catch {
    return { ...DEFAULT_REMOTE_HOST };
  }
}

export function writeRemoteHost(config: RemoteHostConfig): void {
  localStorage.setItem(REMOTE_HOST_KEY, JSON.stringify(config));
}

/**
 * Probe a remote host agent. Real agents should expose GET /health or WS /play.
 * Falls back to demo stream when unreachable so the UI stays usable.
 */
export async function probeRemoteHost(
  config: RemoteHostConfig,
  signal?: AbortSignal,
): Promise<{ state: HostConnectionState; detail: string }> {
  if (!config.enabled) {
    return { state: "idle", detail: "Remote host mode is off." };
  }
  if (!config.endpoint.trim()) {
    return { state: "error", detail: "Enter a host endpoint." };
  }

  const endpoint = config.endpoint.trim();
  const httpBase = endpoint
    .replace(/^ws:/i, "http:")
    .replace(/^wss:/i, "https:")
    .replace(/\/$/, "");

  try {
    const res = await fetch(`${httpBase}/health`, {
      method: "GET",
      signal,
      headers: config.token
        ? { Authorization: `Bearer ${config.token}` }
        : undefined,
    });
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        os?: string;
        minecraft?: boolean;
      };
      return {
        state: "connected",
        detail: `Linked to ${config.name} (${body.os || config.os}).`,
      };
    }
  } catch {
    // fall through to WS probe / demo
  }

  // Soft WebSocket probe — many agents only speak WS.
  if (endpoint.startsWith("ws")) {
    const wsResult = await new Promise<HostConnectionState>((resolve) => {
      let settled = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(endpoint);
      } catch {
        resolve("demo");
        return;
      }
      const done = (state: HostConnectionState) => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve(state);
      };
      const timer = window.setTimeout(() => done("demo"), 1800);
      ws.onopen = () => {
        window.clearTimeout(timer);
        done("connected");
      };
      ws.onerror = () => {
        window.clearTimeout(timer);
        done("demo");
      };
      signal?.addEventListener("abort", () => {
        window.clearTimeout(timer);
        done("demo");
      });
    });

    if (wsResult === "connected") {
      return {
        state: "connected",
        detail: `WebSocket open on ${config.name}.`,
      };
    }
  }

  return {
    state: "demo",
    detail: `Host offline — demo remote stream for ${config.os} (${config.name}). Run the Playcache host agent on that machine to go live.`,
  };
}
