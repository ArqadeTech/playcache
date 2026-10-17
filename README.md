# Playcache

Own it on Steam. Play the session in your browser.

Playcache is a Vercel-deployable Next.js app that:

1. Signs players in with **Steam OpenID**
2. Loads their **owned games** via the Steam Web API
3. Writes a **playable session slice** into the browser (Cache Storage + IndexedDB)
4. Starts a **stream session** for AAA titles (or a native browser demo game)

## What this is (and is not)

Browsers cannot run native DirectX AAA installs (GTA V, etc.) from cache alone. Legitimate browser play uses:

- **Steam ownership checks** so only games you own can start
- **A bounded browser cache** for codecs, shaders, input maps, and stream buffers
- **A secured play node** that runs the real game and streams video + accepts input

This repo ships the web product, auth, library, and cache UX. The GPU stream farm is represented by a live session stage you can swap for WebRTC later. Includes **Orbit Drift**, a small native game that fully plays after caching.

No cracked or pirated game files are used or required.

## Quick start

```bash
cd playcache
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and use **Try demo library**.

## Steam (production)

1. Create a Steam Web API key: https://steamcommunity.com/dev/apikey  
2. Copy `.env.example` → `.env.local` and fill:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STEAM_API_KEY=your_key
SESSION_SECRET=long-random-string
```

3. Restart `npm run dev`, then use **Connect Steam**.

For Vercel, set the same env vars and point `NEXT_PUBLIC_SITE_URL` at your deployment URL (e.g. `https://playcache.vercel.app`).

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or import the `playcache` folder in the Vercel dashboard. Framework preset: **Next.js**.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Local development server |
| `npm run build`| Production build         |
| `npm run start`| Serve production build   |
| `npm run lint` | ESLint                   |

## Stack

- Next.js App Router
- Steam OpenID + Web API
- Browser Cache Storage / IndexedDB for session slices
- Tailwind CSS v4
