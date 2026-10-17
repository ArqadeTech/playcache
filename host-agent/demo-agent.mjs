#!/usr/bin/env node
/**
 * Minimal Playcache host agent for local demos.
 * Serves GET /health on :8787 so the browser can mark the host as connected.
 * Replace the stub with encode + input injection for production.
 */
import http from "node:http";
import os from "node:os";

const PORT = Number(process.env.PLAYCACHE_HOST_PORT || 8787);
const TOKEN = process.env.PLAYCACHE_HOST_TOKEN || "";

function authorized(req) {
  if (!TOKEN) return true;
  const header = req.headers.authorization || "";
  return header === `Bearer ${TOKEN}`;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (!authorized(req)) {
    res.writeHead(401);
    res.end("unauthorized");
    return;
  }
  if (req.url?.startsWith("/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        os: process.platform === "win32" ? "windows" : "linux",
        minecraft: true,
        hostname: os.hostname(),
      }),
    );
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Playcache host agent (demo). Use /health and attach WebRTC here.");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Playcache host agent listening on http://127.0.0.1:${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/health`);
  console.log(
    "In Playcache, set remote host endpoint to http://127.0.0.1:8787 (or ws://… once you add WS).",
  );
});
