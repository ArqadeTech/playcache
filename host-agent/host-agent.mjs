#!/usr/bin/env node
/**
 * Playcache host agent — real remote play for Minecraft (and any X11 session).
 *
 * - GET  /health
 * - GET  /mjpeg          live JPEG stream of the display
 * - WS   /control        keyboard / mouse input → xdotool
 * - POST /mods/sync      download Modrinth jars into the instance mods folder
 * - POST /launch         start Minecraft / Prism / fallback session
 * - GET  /status
 *
 * Env:
 *   PLAYCACHE_HOST_PORT=8787
 *   PLAYCACHE_HOST_TOKEN=
 *   PLAYCACHE_DISPLAY=:1
 *   PLAYCACHE_MC_DIR=~/.minecraft
 *   PLAYCACHE_MODS_DIR=~/.minecraft/mods
 *   MODRINTH_TOKEN=   (optional; used if client does not send file URLs)
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFile } from "node:child_process";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PLAYCACHE_HOST_PORT || 8787);
const TOKEN = process.env.PLAYCACHE_HOST_TOKEN || "";
const DISPLAY = process.env.PLAYCACHE_DISPLAY || process.env.DISPLAY || ":1";
const HOME = os.homedir();
const MC_DIR = expand(
  process.env.PLAYCACHE_MC_DIR || path.join(HOME, ".minecraft"),
);
const MODS_DIR = expand(
  process.env.PLAYCACHE_MODS_DIR || path.join(MC_DIR, "mods"),
);
const WIDTH = Number(process.env.PLAYCACHE_WIDTH || 1280);
const HEIGHT = Number(process.env.PLAYCACHE_HEIGHT || 720);
const FPS = Number(process.env.PLAYCACHE_FPS || 12);

const state = {
  streaming: false,
  clients: 0,
  launched: null,
  lastLaunch: null,
  modsInstalled: [],
  capture: null,
};

function expand(p) {
  if (p.startsWith("~/")) return path.join(HOME, p.slice(2));
  return p;
}

function authorized(req) {
  if (!TOKEN) return true;
  const header = req.headers.authorization || "";
  const q = new URL(req.url || "/", "http://x").searchParams.get("token");
  return header === `Bearer ${TOKEN}` || q === TOKEN;
}

function json(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function which(bin) {
  return new Promise((resolve) => {
    execFile("which", [bin], (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, DISPLAY, ...opts.env },
      stdio: opts.stdio || "ignore",
      detached: Boolean(opts.detached),
    });
    if (opts.detached) {
      child.unref();
      resolve(child);
      return;
    }
    let out = "";
    let err = "";
    child.stdout?.on("data", (d) => (out += d));
    child.stderr?.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(err || out || `${cmd} exited ${code}`));
    });
  });
}

async function xdotool(args) {
  const bin = await which("xdotool");
  if (!bin) throw new Error("xdotool not found");
  await run(bin, args);
}

async function ensureDisplay() {
  // If no X server, try starting Xvfb
  const xset = await which("xset");
  try {
    if (xset) await run(xset, ["q"]);
    return DISPLAY;
  } catch {
    const xvfb = await which("Xvfb");
    if (!xvfb) return DISPLAY;
    spawn(xvfb, [DISPLAY, "-screen", "0", `${WIDTH}x${HEIGHT}x24`], {
      stdio: "ignore",
      detached: true,
    }).unref();
    await new Promise((r) => setTimeout(r, 800));
    return DISPLAY;
  }
}

function startMjpeg(res) {
  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Connection: "close",
    "Access-Control-Allow-Origin": "*",
  });

  // Grab the full display (geometry varies). Scale down for bandwidth.
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-f",
      "x11grab",
      "-framerate",
      String(FPS),
      "-i",
      `${DISPLAY}.0`,
      "-vf",
      `scale=${WIDTH}:-1`,
      "-q:v",
      "7",
      "-f",
      "mjpeg",
      "pipe:1",
    ],
    { env: { ...process.env, DISPLAY } },
  );

  state.streaming = true;
  state.capture = ffmpeg;

  let buffer = Buffer.alloc(0);
  const SOI = Buffer.from([0xff, 0xd8]);
  const EOI = Buffer.from([0xff, 0xd9]);

  ffmpeg.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const start = buffer.indexOf(SOI);
      if (start === -1) {
        buffer = Buffer.alloc(0);
        break;
      }
      if (start > 0) buffer = buffer.subarray(start);
      const end = buffer.indexOf(EOI, 2);
      if (end === -1) break;
      const frame = buffer.subarray(0, end + 2);
      buffer = buffer.subarray(end + 2);
      res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
      res.write(frame);
      res.write("\r\n");
    }
  });

  ffmpeg.stderr.on("data", (d) => {
    const msg = d.toString();
    if (msg.trim()) console.error("[ffmpeg]", msg.trim());
  });

  const cleanup = () => {
    state.streaming = false;
    try {
      ffmpeg.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  };
  res.on("close", cleanup);
  ffmpeg.on("close", () => {
    state.streaming = false;
    try {
      res.end();
    } catch {
      /* ignore */
    }
  });
}

async function handleInput(msg) {
  const type = msg.type;
  if (type === "keydown" || type === "keyup") {
    const key = mapKey(msg.code || msg.key);
    if (!key) return;
    const down = type === "keydown" ? "keydown" : "keyup";
    await xdotool([down, key]);
    return;
  }
  if (type === "mousemove" && Number.isFinite(msg.x) && Number.isFinite(msg.y)) {
    const x = Math.round(msg.x * WIDTH);
    const y = Math.round(msg.y * HEIGHT);
    await xdotool(["mousemove", "--sync", String(x), String(y)]);
    return;
  }
  if (type === "mousedown" || type === "mouseup") {
    const btn = msg.button === 2 ? "3" : msg.button === 1 ? "2" : "1";
    await xdotool([type === "mousedown" ? "mousedown" : "mouseup", btn]);
    return;
  }
  if (type === "click") {
    await xdotool(["click", "1"]);
  }
}

function mapKey(code) {
  if (!code) return null;
  const map = {
    Space: "space",
    ShiftLeft: "shift",
    ShiftRight: "shift",
    ControlLeft: "ctrl",
    ControlRight: "ctrl",
    AltLeft: "alt",
    Escape: "Escape",
    Enter: "Return",
    Backspace: "BackSpace",
    Tab: "Tab",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key") && code.length === 4) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
  return code.length === 1 ? code : null;
}

async function syncMods(files) {
  fs.mkdirSync(MODS_DIR, { recursive: true });
  const installed = [];
  for (const file of files) {
    const dest = path.join(MODS_DIR, file.filename);
    console.log("Downloading", file.filename);
    const res = await fetch(file.url, {
      headers: {
        "User-Agent": "Playcache-HostAgent/0.1",
        ...(process.env.MODRINTH_TOKEN
          ? { Authorization: `Bearer ${process.env.MODRINTH_TOKEN}` }
          : {}),
      },
    });
    if (!res.ok) throw new Error(`Download failed ${file.filename}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    installed.push({
      filename: file.filename,
      slug: file.slug,
      size: buf.length,
      path: dest,
    });
  }
  state.modsInstalled = installed;
  return installed;
}

async function findMinecraftLaunchers() {
  const candidates = [
    "minecraft-launcher",
    "minecraft-launcher-cmd",
    "prismlauncher",
    "PrismLauncher",
    "multimc",
  ];
  const found = [];
  for (const c of candidates) {
    const p = await which(c);
    if (p) found.push(p);
  }
  // Common paths
  for (const p of [
    path.join(HOME, ".local/share/PrismLauncher/PrismLauncher"),
    "/usr/bin/prismlauncher",
    "/usr/bin/minecraft-launcher",
  ]) {
    if (fs.existsSync(p) && !found.includes(p)) found.push(p);
  }
  return found;
}

async function launchMinecraft(opts = {}) {
  const launchers = await findMinecraftLaunchers();
  if (launchers.length) {
    const bin = launchers[0];
    const child = spawn(bin, [], {
      env: { ...process.env, DISPLAY },
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    state.launched = bin;
    state.lastLaunch = new Date().toISOString();
    return {
      ok: true,
      mode: "launcher",
      command: bin,
      message: `Started ${bin}. Log into Minecraft on the host display — the browser streams that screen.`,
    };
  }

  // Official jar present?
  const jar = path.join(MC_DIR, "versions");
  if (fs.existsSync(jar)) {
    return {
      ok: true,
      mode: "manual",
      message: `Found ${MC_DIR}. Start your Minecraft client on this machine; Playcache is already streaming the display.`,
      modsDir: MODS_DIR,
    };
  }

  // Fallback: open a focused playable session window so stream+input are real,
  // and keep mods ready for when Minecraft is installed.
  if (opts.allowFallback !== false) {
    await launchFallbackSession(opts);
    return {
      ok: true,
      mode: "fallback-session",
      message:
        "Minecraft launcher not found on this host. Streaming a live play session window; mods were synced to the mods folder. Install Prism/official Minecraft on this PC and press Launch again for the real client.",
      modsDir: MODS_DIR,
    };
  }

  return {
    ok: false,
    message: "No Minecraft launcher found. Install Prism Launcher or the official launcher on this host.",
  };
}

async function launchFallbackSession(opts) {
  // Start a simple fullscreen-ish chromium/kiosk OR java window showing status.
  // Prefer opening an interactive terminal + status UI via a local HTML file in chromium.
  const html = path.join(__dirname, "session-display.html");
  writeSessionDisplay(html, opts);
  const chrome =
    (await which("google-chrome")) ||
    (await which("chromium-browser")) ||
    (await which("chromium")) ||
    (await which("google-chrome-stable"));
  if (chrome) {
    const child = spawn(
      chrome,
      [
        `--app=file://${html}`,
        `--window-size=${WIDTH},${HEIGHT}`,
        "--window-position=0,0",
        "--disable-infobars",
      ],
      { env: { ...process.env, DISPLAY }, detached: true, stdio: "ignore" },
    );
    child.unref();
    state.launched = chrome;
    state.lastLaunch = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await xdotool(["search", "--name", "Playcache Session", "windowactivate"]);
    } catch {
      /* ignore */
    }
    return;
  }
  // Last resort: xterm
  const xterm = await which("xterm");
  if (xterm) {
    spawn(
      xterm,
      ["-geometry", "120x40+0+0", "-T", "Playcache Session", "-e", "bash", "-lc", "echo Playcache host ready; echo Mods: " + MODS_DIR + "; exec bash"],
      { env: { ...process.env, DISPLAY }, detached: true, stdio: "ignore" },
    ).unref();
    state.launched = "xterm";
    state.lastLaunch = new Date().toISOString();
  }
}

function writeSessionDisplay(file, opts) {
  const mods = (opts.mods || []).map((m) => m.name || m.slug).join(", ") || "none";
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Playcache Session</title>
<style>
  html,body{margin:0;height:100%;background:#0b1a14;color:#e8fff2;font-family:system-ui,sans-serif}
  .wrap{display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;gap:12px;
    background:radial-gradient(800px 400px at 70% 10%,rgba(124,255,178,.2),transparent),#07110f}
  h1{font-size:42px;margin:0}
  .grid{display:grid;grid-template-columns:repeat(8,48px);gap:4px;margin-top:18px}
  .b{width:48px;height:48px;background:#2f9e68;box-shadow:inset 0 -6px 0 #1a4a2e}
  .b:nth-child(3n){background:#7cffb2}
  p{opacity:.8;max-width:520px;text-align:center;line-height:1.45}
  kbd{background:#12241f;border:1px solid rgba(124,255,178,.3);padding:2px 6px;border-radius:4px}
</style></head>
<body>
<div class="wrap">
  <h1>Playcache · live host</h1>
  <p>This display is what the browser is streaming. Input from the web client (and mobile controls) is injected here via xdotool.</p>
  <p>Version ${opts.version || "?"} · ${opts.loader || "?"} · mods: ${mods}</p>
  <p>Install <b>Prism Launcher</b> or official Minecraft on this machine, then hit Launch again for the real client. Mods folder: <code>${MODS_DIR}</code></p>
  <p>Try keys: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <kbd>Space</kbd></p>
  <div class="grid">${Array.from({ length: 32 }).map(() => '<div class="b"></div>').join("")}</div>
</div>
<script>
document.addEventListener('keydown',e=>{
  const el=document.createElement('div');
  el.textContent='key '+e.code;
  el.style.cssText='position:fixed;bottom:12px;left:12px;background:#12241f;padding:6px 10px;border:1px solid #7cffb2';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),600);
});
</script>
</body></html>`;
  fs.writeFileSync(file, html);
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (!authorized(req)) {
    json(res, 401, { error: "unauthorized" });
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    const launchers = await findMinecraftLaunchers();
    json(res, 200, {
      ok: true,
      os: process.platform === "win32" ? "windows" : "linux",
      minecraft: launchers.length > 0 || fs.existsSync(MC_DIR),
      hostname: os.hostname(),
      display: DISPLAY,
      modsDir: MODS_DIR,
      launchers,
      streaming: state.streaming,
    });
    return;
  }

  if (url.pathname === "/status") {
    json(res, 200, { ...state, modsDir: MODS_DIR, display: DISPLAY });
    return;
  }

  if (url.pathname === "/mjpeg") {
    await ensureDisplay();
    startMjpeg(res);
    return;
  }

  if (url.pathname === "/mods/sync" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const files = body.files || [];
      if (!files.length) {
        json(res, 400, { error: "files[] required" });
        return;
      }
      const installed = await syncMods(files);
      json(res, 200, { ok: true, installed, modsDir: MODS_DIR });
    } catch (e) {
      json(res, 500, { error: String(e.message || e) });
    }
    return;
  }

  if (url.pathname === "/launch" && req.method === "POST") {
    try {
      const body = await readBody(req);
      await ensureDisplay();
      if (Array.isArray(body.files) && body.files.length) {
        await syncMods(body.files);
      }
      const result = await launchMinecraft(body);
      json(res, result.ok ? 200 : 404, result);
    } catch (e) {
      json(res, 500, { error: String(e.message || e) });
    }
    return;
  }

  json(res, 200, {
    service: "playcache-host-agent",
    endpoints: ["/health", "/mjpeg", "/control (ws)", "/mods/sync", "/launch", "/status"],
  });
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (!authorized(req)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  const url = new URL(req.url || "/", "http://x");
  if (url.pathname !== "/control" && url.pathname !== "/") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    state.clients += 1;
    console.log("control client connected", state.clients);
    ws.send(JSON.stringify({ type: "hello", display: DISPLAY, width: WIDTH, height: HEIGHT }));
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        await handleInput(msg);
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: String(e.message || e) }));
      }
    });
    ws.on("close", () => {
      state.clients = Math.max(0, state.clients - 1);
    });
  });
});

await ensureDisplay();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Playcache host agent on http://0.0.0.0:${PORT}`);
  console.log(`  health  http://127.0.0.1:${PORT}/health`);
  console.log(`  stream  http://127.0.0.1:${PORT}/mjpeg`);
  console.log(`  control ws://127.0.0.1:${PORT}/control`);
  console.log(`  display ${DISPLAY}  mods ${MODS_DIR}`);
});
