# Playcache

Own it on Steam. Play the session in your browser.  
Also: **Minecraft + CurseForge mods** — pick a version, build a pack, cache it locally.

Playcache is a Vercel-deployable Next.js app that:

1. Signs players in with **Steam OpenID** (for the Steam library)
2. Loads **owned Steam games** via the Steam Web API
3. Lets you build a **Minecraft modpack** (version + Forge/Fabric/NeoForge/Quilt + CurseForge mods)
4. Optional **remote host mode** — Minecraft runs on your Linux/Windows PC; the browser is the client
5. **Mobile Minecraft HUD** + customizable on-screen controller (Minecraft only)
6. Writes a **playable session / pack slice** into the browser (Cache Storage + IndexedDB)

## What this is (and is not)

Browsers cannot run native DirectX AAA installs or redistribute Minecraft Java jars from cache alone. Legitimate browser play uses:

- **Ownership checks** (Steam for PC titles; Mojang/Microsoft account for Java in production)
- **CurseForge** for legal mod metadata / discovery (API key optional; demo catalog included)
- **A bounded browser cache** for pack manifests, codecs, shaders, and session buffers
- **A secured play node** that runs the real game/client and streams video + accepts input

No cracked clients, pirated jars, or unauthorized Minecraft redistributions.

## Quick start

```bash
cd playcache
npm install
npm run dev
```

- Steam demo: [http://localhost:3000](http://localhost:3000) → **Try demo library** (or Connect Steam)
- Minecraft: [http://localhost:3000/minecraft](http://localhost:3000/minecraft)

### Remote host (your PC runs Minecraft)

```bash
node host-agent/demo-agent.mjs
```

In **Minecraft studio → Remote host**, enable it and set endpoint to
`http://127.0.0.1:8787`. See `host-agent/README.md`.

### Mobile controls

On `/minecraft`, enable **Force on-screen controller** (or open on a phone).
In-play, use **Edit controls** to drag buttons and tap to rebind keys. Layout
is saved in the browser.

## Environment

Copy `.env.example` → `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STEAM_API_KEY=
CURSEFORGE_API_KEY=
SESSION_SECRET=long-random-string
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (Steam OpenID return_to) |
| `STEAM_API_KEY` | Live Steam library; omit for demo library |
| `MODRINTH_TOKEN` | Live Modrinth mod search + jar resolve (`mrp_…`) |
| `CURSEFORGE_API_KEY` | Optional CurseForge catalog fallback |
| `SESSION_SECRET` | Signs session cookies |

Modrinth tokens: [modrinth.com/settings/account](https://modrinth.com/settings/account)

### Real remote Minecraft

```bash
# Terminal A — host PC (needs ffmpeg + xdotool + X11, and ideally Prism/Minecraft)
npm run host

# Terminal B — web app
npm run dev
```

Enable **Remote host** → endpoint `http://<pc-ip>:8787` → pick Modrinth mods → **Connect & play**.
The agent downloads jars into `~/.minecraft/mods`, launches your Minecraft client (or a live session window), and streams the display into the browser.

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or import the `playcache` folder in the Vercel dashboard. Framework preset: **Next.js**. Set the env vars above on the project.

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Local development server |
| `npm run build` | Production build         |
| `npm run start` | Serve production build   |
| `npm run lint`  | ESLint                   |

## Stack

- Next.js App Router
- Steam OpenID + Web API
- CurseForge Mods API (`gameId=432`)
- Browser Cache Storage / IndexedDB for session + modpack slices
- Tailwind CSS v4
