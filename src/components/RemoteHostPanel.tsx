"use client";

import { useState } from "react";
import type { HostOs, RemoteHostConfig } from "@/lib/remote-host";
import { writeRemoteHost } from "@/lib/remote-host";

export function RemoteHostPanel({
  value,
  onChange,
}: {
  value: RemoteHostConfig;
  onChange: (next: RemoteHostConfig) => void;
}) {
  const [savedFlash, setSavedFlash] = useState(false);

  function update(patch: Partial<RemoteHostConfig>) {
    const next = { ...value, ...patch };
    onChange(next);
    writeRemoteHost(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 900);
  }

  return (
    <section className="rounded-sm border border-line bg-panel/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Remote host
          </h2>
          <p className="mt-1 max-w-xl text-sm text-fog leading-relaxed">
            Run Minecraft on your own Linux or Windows PC. The browser client
            streams the session and sends input — your machine owns the Java
            process and mods.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-paper">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="accent-[var(--signal)]"
          />
          Enable remote host
        </label>
      </div>

      {value.enabled ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Host OS
            </span>
            <select
              value={value.os}
              onChange={(e) => update({ os: e.target.value as HostOs })}
              className="mt-1 w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-signal"
            >
              <option value="linux">Linux</option>
              <option value="windows">Windows</option>
            </select>
          </label>

          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Display name
            </span>
            <input
              value={value.name}
              onChange={(e) => update({ name: e.target.value })}
              className="mt-1 w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-signal"
              placeholder="Living-room PC"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Host agent endpoint
            </span>
            <input
              value={value.endpoint}
              onChange={(e) => update({ endpoint: e.target.value })}
              className="mt-1 w-full rounded-sm border border-line bg-ink px-3 py-2 font-mono text-sm outline-none focus:border-signal"
              placeholder="http://192.168.1.20:8787"
            />
            <span className="mt-1 block text-xs text-fog">
              Point at the Playcache host agent. Health checks hit{" "}
              <code className="text-signal">/health</code>; you can also use{" "}
              <code className="text-signal">ws://</code> for a live socket.
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fog">
              Auth token (optional)
            </span>
            <input
              value={value.token}
              onChange={(e) => update({ token: e.target.value })}
              type="password"
              autoComplete="off"
              className="mt-1 w-full rounded-sm border border-line bg-ink px-3 py-2 font-mono text-sm outline-none focus:border-signal"
              placeholder="shared secret"
            />
          </label>
        </div>
      ) : null}

      <p className="mt-4 font-mono text-[11px] text-fog">
        {savedFlash
          ? "Saved locally."
          : value.enabled
            ? `${value.os} · ${value.name} · ${value.endpoint || "no endpoint"}`
            : "Cloud play node will be used when remote host is off."}
      </p>
    </section>
  );
}
