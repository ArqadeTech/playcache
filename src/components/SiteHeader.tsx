"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SteamUser } from "@/lib/types";

type SessionState = {
  authenticated: boolean;
  demo: boolean;
  user: SteamUser | null;
};

export function SiteHeader() {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSession({ authenticated: false, demo: false, user: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="flex items-center justify-between gap-4 px-5 py-4 md:px-8">
      <Link href="/" className="group flex items-baseline gap-2">
        <span
          className="text-xl font-extrabold tracking-tight md:text-2xl"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Playcache
        </span>
        <span className="hidden text-xs text-fog sm:inline">steam · browser</span>
      </Link>

      <nav className="flex items-center gap-2 md:gap-3">
        {session?.authenticated ? (
          <>
            <Link href="/library" className="btn-ghost !py-2 !px-3 text-sm">
              Library
            </Link>
            <span className="hidden max-w-[10rem] truncate text-sm text-fog sm:inline">
              {session.user?.personaName}
              {session.demo ? " · demo" : ""}
            </span>
            <a href="/api/auth/logout" className="btn-ghost !py-2 !px-3 text-sm">
              Sign out
            </a>
          </>
        ) : (
          <a href="/api/auth/steam?demo=1" className="btn-signal !py-2 !px-3 text-sm">
            Open library
          </a>
        )}
      </nav>
    </header>
  );
}
