import type { ModLoader, PackMod } from "./minecraft";

const API = "https://api.modrinth.com/v2";

export function modrinthConfigured(): boolean {
  return Boolean(process.env.MODRINTH_TOKEN);
}

function authHeaders(): HeadersInit {
  const token = process.env.MODRINTH_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "Playcache/0.1 (github.com/playcache)",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type MrHit = {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  downloads: number;
  icon_url: string | null;
};

type MrVersion = {
  id: string;
  version_number: string;
  files: Array<{
    url: string;
    filename: string;
    size: number;
    primary: boolean;
  }>;
};

const LOADER_CATEGORY: Record<ModLoader, string> = {
  forge: "forge",
  fabric: "fabric",
  neoforge: "neoforge",
  quilt: "quilt",
};

export async function searchModrinthMods(opts: {
  version: string;
  loader: ModLoader;
  query: string;
  limit?: number;
}): Promise<{ mods: PackMod[]; demo: boolean; note: string | null; source: "modrinth" }> {
  const facets = [
    ["project_type:mod"],
    [`versions:${opts.version}`],
    [`categories:${LOADER_CATEGORY[opts.loader]}`],
  ];
  const url = new URL(`${API}/search`);
  url.searchParams.set("limit", String(opts.limit ?? 24));
  url.searchParams.set("index", "relevance");
  url.searchParams.set("facets", JSON.stringify(facets));
  if (opts.query.trim()) url.searchParams.set("query", opts.query.trim());

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Modrinth search failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { hits: MrHit[] };
  const mods: PackMod[] = (json.hits ?? []).map((hit) => ({
    id: hashId(hit.project_id),
    slug: hit.slug,
    name: hit.title,
    summary: hit.description,
    author: hit.author,
    logoUrl: hit.icon_url,
    downloadCount: hit.downloads,
    fileSizeMb: 2,
    curseUrl: `https://modrinth.com/mod/${hit.slug}`,
    projectId: hit.project_id,
    source: "modrinth" as const,
  }));

  return {
    mods,
    demo: false,
    note: null,
    source: "modrinth",
  };
}

export async function resolveModrinthFiles(opts: {
  slugs: string[];
  version: string;
  loader: ModLoader;
}): Promise<
  Array<{
    slug: string;
    title: string;
    filename: string;
    url: string;
    size: number;
    versionNumber: string;
  }>
> {
  const out: Array<{
    slug: string;
    title: string;
    filename: string;
    url: string;
    size: number;
    versionNumber: string;
  }> = [];

  for (const slug of opts.slugs) {
    const projectRes = await fetch(`${API}/project/${slug}`, {
      headers: authHeaders(),
    });
    if (!projectRes.ok) continue;
    const project = (await projectRes.json()) as { title: string; slug: string };

    const vUrl = new URL(`${API}/project/${slug}/version`);
    vUrl.searchParams.set("game_versions", JSON.stringify([opts.version]));
    vUrl.searchParams.set("loaders", JSON.stringify([opts.loader]));

    const vRes = await fetch(vUrl.toString(), { headers: authHeaders() });
    if (!vRes.ok) continue;
    const versions = (await vRes.json()) as MrVersion[];
    const version = versions[0];
    if (!version) continue;
    const file = version.files.find((f) => f.primary) ?? version.files[0];
    if (!file) continue;
    out.push({
      slug: project.slug,
      title: project.title,
      filename: file.filename,
      url: file.url,
      size: file.size,
      versionNumber: version.version_number,
    });
  }
  return out;
}

function hashId(projectId: string): number {
  let h = 0;
  for (let i = 0; i < projectId.length; i++) {
    h = (h * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}
