# Playcache host agent (Minecraft remote mode)

Run this on the **Linux or Windows PC** that owns Minecraft Java + your mods.
The browser client connects to the agent, receives a stream, and sends input
(keyboard / mobile on-screen controls).

## Contract

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | JSON `{ "ok": true, "os": "linux"\|"windows", "minecraft": true }` |
| `WS /` or your configured path | Session: video/input (or WebRTC signaling) |

Optional header: `Authorization: Bearer <token>` matching the token in the web UI.

## Quick demo agent

```bash
# from playcache/
node host-agent/demo-agent.mjs
```

Then in Playcache → Minecraft → enable **Remote host**:

- Endpoint: `http://127.0.0.1:8787`
- OS: match your machine
- Play → Enter world

The demo agent answers `/health` and accepts WebSockets. Swap in ffmpeg / OBS /
WebRTC encode + uinput / SendInput for a production host.

## Notes

- You must own Minecraft; the agent launches **your** installed client.
- Mods stay on the host disk; the browser only caches the pack manifest / session slice.
- Mobile controls emit `KeyboardEvent`s in the page; forward those over the WS to the host.
