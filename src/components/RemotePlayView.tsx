"use client";

import { useEffect, useRef, useState } from "react";
import {
  controlWsUrl,
  hostLaunch,
  mjpegUrl,
  subscribeHostInput,
  type HostInputMessage,
} from "@/lib/host-client";
import type { RemoteHostConfig } from "@/lib/remote-host";
import type { ModLoader, PackMod } from "@/lib/minecraft";

export function RemotePlayView({
  host,
  version,
  loader,
  mods,
  files,
}: {
  host: RemoteHostConfig;
  version: string;
  loader: ModLoader;
  mods: PackMod[];
  files: Array<{
    slug: string;
    title: string;
    filename: string;
    url: string;
    size: number;
    versionNumber: string;
  }>;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState("connecting");
  const [launchMsg, setLaunchMsg] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState(0);

  useEffect(() => {
    let closed = false;
    const url = controlWsUrl(host);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!closed) setStatus("connected");
    };
    ws.onclose = () => {
      if (!closed) setStatus("disconnected");
    };
    ws.onerror = () => {
      if (!closed) setStatus("error");
    };

    const send = (msg: HostInputMessage) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    const unsub = subscribeHostInput(send);
    const onBus = (e: Event) => {
      const detail = (e as CustomEvent).detail as HostInputMessage;
      if (detail?.type) send(detail);
    };
    window.addEventListener("playcache-host-input", onBus);

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.repeat) return;
      // Don't steal keys while typing in inputs.
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      send({
        type: e.type === "keydown" ? "keydown" : "keyup",
        code: e.code,
        key: e.key,
      });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    return () => {
      closed = true;
      unsub();
      window.removeEventListener("playcache-host-input", onBus);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  }, [host]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLaunchMsg("Syncing mods & launching on host…");
      try {
        const result = await hostLaunch(host, {
          version,
          loader,
          mods: mods.map((m) => ({ slug: m.slug, name: m.name })),
          files,
          allowFallback: true,
        });
        if (cancelled) return;
        setLaunchMsg(result.message || (result.ok ? "Launched." : result.error || "Launch failed"));
        // Refresh MJPEG after launch so the new window is captured.
        setStreamKey((k) => k + 1);
      } catch (e) {
        if (!cancelled) {
          setLaunchMsg(e instanceof Error ? e.message : "Launch failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [host, version, loader, mods, files]);

  function onPointer(e: React.PointerEvent, kind: "move" | "down" | "up") {
    const el = wrapRef.current;
    if (!el || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (kind === "move") {
      wsRef.current.send(JSON.stringify({ type: "mousemove", x, y }));
    } else {
      wsRef.current.send(
        JSON.stringify({
          type: kind === "down" ? "mousedown" : "mouseup",
          button: e.button,
        }),
      );
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      <div
        ref={wrapRef}
        className="relative flex-1 cursor-crosshair overflow-hidden bg-[#050c0a]"
        onPointerMove={(e) => onPointer(e, "move")}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          onPointer(e, "down");
        }}
        onPointerUp={(e) => onPointer(e, "up")}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={streamKey}
          ref={imgRef}
          src={mjpegUrl(host)}
          alt="Remote Minecraft host stream"
          className="h-full w-full object-contain"
          draggable={false}
        />
        <div className="pointer-events-none absolute left-2 top-2 rounded-sm border border-line bg-ink/80 px-2 py-1 font-mono text-[10px] text-signal">
          LIVE · {host.name} · {status}
        </div>
      </div>
      {launchMsg ? (
        <div className="border-t border-line bg-ink/95 px-3 py-2 font-mono text-[11px] text-fog">
          {launchMsg}
        </div>
      ) : null}
    </div>
  );
}
