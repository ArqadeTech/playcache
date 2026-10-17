import { cookies } from "next/headers";
import type { SessionPayload, SteamUser } from "./types";

const COOKIE = "playcache_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function secret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.STEAM_API_KEY ||
    "playcache-dev-secret-change-me"
  );
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return Buffer.from(sig).toString("base64url");
}

export async function sealSession(payload: SessionPayload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function unsealSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload?.user?.steamId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return unsealSession(jar.get(COOKIE)?.value);
}

export async function setSessionCookie(
  user: SteamUser,
  demo: boolean,
): Promise<void> {
  const jar = await cookies();
  const token = await sealSession({
    user,
    demo,
    exp: Date.now() + MAX_AGE_SEC * 1000,
  });
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Only mark Secure on HTTPS (Vercel). Local `next start` over http must work too.
    secure: siteUrl().startsWith("https"),
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/** Prefer the incoming request origin so local http://127.0.0.1 vs localhost stay consistent. */
export function requestOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const scheme = proto || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${scheme}://${host}`;
  }
  return siteUrl();
}

export function redirectTo(request: Request, path: string): Response {
  const target = new URL(path, `${requestOrigin(request)}/`);
  return Response.redirect(target, 307);
}
