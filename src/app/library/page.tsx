import { SiteHeader } from "@/components/SiteHeader";
import { LibraryClient } from "@/components/LibraryClient";

export default function LibraryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <h1
            className="text-3xl font-extrabold tracking-tight md:text-5xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Your library
          </h1>
          <p className="mt-3 max-w-xl text-fog">
            Titles you own on Steam. Pick one to write a playable session slice
            into browser cache, then play.
          </p>
          <div className="mt-10">
            <LibraryClient />
          </div>
        </div>
      </main>
    </div>
  );
}
