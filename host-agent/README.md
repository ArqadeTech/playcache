# Playcache host agent (real remote Minecraft)

Run this on the **Linux or Windows PC** that has Minecraft (Prism / official launcher).
The browser streams that display and sends keyboard / mobile-control input.

## Start

```bash
# from playcache/
npm run host
# or: node host-agent/host-agent.mjs
```

Optional env:

```bash
PLAYCACHE_HOST_PORT=8787
PLAYCACHE_DISPLAY=:0          # your desktop display
PLAYCACHE_MC_DIR=~/.minecraft
PLAYCACHE_MODS_DIR=~/.minecraft/mods
MODRINTH_TOKEN=mrp_…          # so the agent can download jars if needed
PLAYCACHE_HOST_TOKEN=secret   # optional auth
```

## Endpoints

| Path | Role |
| --- | --- |
| `GET /health` | Liveness + launcher detection |
| `GET /mjpeg` | Live screen stream (ffmpeg x11grab) |
| `WS /control` | Keyboard / mouse from the browser |
| `POST /mods/sync` | Download Modrinth jars into `mods/` |
| `POST /launch` | Sync mods + start Prism/official Minecraft (or fallback session window) |

## Browser setup

1. Minecraft studio → enable **Remote host**
2. Endpoint `http://<pc-ip>:8787`
3. Build a pack from Modrinth → **Cache pack & play** → **Connect & play**

The web app resolves jar URLs via Modrinth, tells the agent to install them, launches Minecraft on the host, and shows the live MJPEG stream.

## Requirements (Linux)

- `ffmpeg`, `xdotool`, X11 display (or Xvfb)
- Java + Prism Launcher or official Minecraft for the real client

Windows: run under WSL2 with an X server, or adapt capture to DXGI (future).
