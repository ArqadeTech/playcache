import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MinecraftPlaySession } from "@/components/MinecraftPlaySession";
import type { ModLoader } from "@/lib/minecraft";
import { MC_VERSIONS } from "@/lib/minecraft";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseLoader(raw: string | undefined): ModLoader {
  if (raw === "fabric" || raw === "neoforge" || raw === "quilt" || raw === "forge") {
    return raw;
  }
  return "forge";
}

async function PlayBody({ searchParams }: PageProps) {
  const params = await searchParams;
  const versionRaw = Array.isArray(params.version) ? params.version[0] : params.version;
  const loaderRaw = Array.isArray(params.loader) ? params.loader[0] : params.loader;
  const version = MC_VERSIONS.some((v) => v.id === versionRaw)
    ? (versionRaw as string)
    : "1.20.1";
  const loader = parseLoader(loaderRaw);

  return <MinecraftPlaySession version={version} loader={loader} />;
}

export default function MinecraftPlayPage({ searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <p className="px-5 py-16 font-mono text-sm text-fog md:px-10">
              Loading Minecraft session…
            </p>
          }
        >
          <PlayBody searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
