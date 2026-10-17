import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative min-h-[100svh] overflow-hidden">
        <div className="hero-plane" aria-hidden />
        <div className="relative z-10 flex min-h-[100svh] flex-col">
          <SiteHeader />
          <section className="flex flex-1 flex-col justify-end px-5 pb-14 pt-24 md:justify-center md:px-10 md:pb-20 md:pt-10 lg:max-w-3xl">
            <p
              className="animate-rise mb-4 text-4xl font-extrabold tracking-tight text-paper md:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Playcache
            </p>
            <h1 className="animate-rise-delay-1 max-w-xl text-2xl font-semibold leading-tight tracking-tight text-paper md:text-4xl">
              Own it on Steam. Play the session in your browser.
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-md text-base leading-relaxed text-fog md:text-lg">
              Connect Steam, verify ownership, then cache a playable slice locally
              and stream the rest over a fast connection — no cracked installs.
            </p>
            <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
              <a href="/api/auth/steam" className="btn-signal">
                Connect Steam
              </a>
              <a href="/api/auth/steam?demo=1" className="btn-ghost">
                Try demo library
              </a>
            </div>
          </section>
        </div>
      </div>

      <section className="border-t border-line px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
          <div>
            <h2
              className="text-3xl font-bold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Ownership first. Cache second.
            </h2>
            <p className="mt-4 max-w-md text-fog leading-relaxed">
              Playcache only starts titles you own on Steam. A bounded session
              slice — codecs, input maps, shaders, and stream buffers — lives in
              your browser cache. AAA binaries stay on secured stream nodes, not
              as pirated browser ports.
            </p>
          </div>
          <ol className="space-y-5 font-mono text-sm text-paper/90">
            <li className="border-l-2 border-signal pl-4">
              <span className="text-signal">01</span> Steam OpenID signs you in
            </li>
            <li className="border-l-2 border-signal/60 pl-4">
              <span className="text-signal">02</span> Library API confirms ownership
            </li>
            <li className="border-l-2 border-signal/40 pl-4">
              <span className="text-signal">03</span> Browser caches the playable slice
            </li>
            <li className="border-l-2 border-signal/25 pl-4">
              <span className="text-signal">04</span> Stream + input over a strong link
            </li>
          </ol>
        </div>
      </section>

      <section className="border-t border-line px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Built for Vercel.
          </h2>
          <p className="mt-4 max-w-xl text-fog leading-relaxed">
            The web app, Steam auth callbacks, and library APIs deploy as a
            standard Next.js project. Point{" "}
            <code className="font-mono text-signal">STEAM_API_KEY</code> and{" "}
            <code className="font-mono text-signal">SESSION_SECRET</code> at your
            project, set the site URL, and ship.
          </p>
          <div className="mt-8">
            <Link href="/library" className="btn-ghost">
              Go to library
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-line px-5 py-8 text-sm text-fog md:px-10">
        <p>
          Playcache verifies Steam ownership and keeps session data in browser
          storage. Full AAA installs are not executed inside the browser sandbox.
        </p>
      </footer>
    </div>
  );
}
