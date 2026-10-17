import { SiteHeader } from "@/components/SiteHeader";
import { MinecraftStudio } from "@/components/MinecraftStudio";

export default function MinecraftPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
            Minecraft · CurseForge
          </p>
          <h1
            className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Load a version. Pick your mods.
          </h1>
          <p className="mt-3 max-w-2xl text-fog leading-relaxed">
            Choose a Minecraft release and Forge / Fabric / NeoForge / Quilt,
            then add mods from CurseForge. Playcache caches the pack slice in
            your browser and starts an ownership-checked session — no pirated
            clients or cracked jars.
          </p>
          <div className="mt-10">
            <MinecraftStudio />
          </div>
        </div>
      </main>
    </div>
  );
}
