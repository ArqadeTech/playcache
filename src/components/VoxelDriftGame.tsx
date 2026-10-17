"use client";

import { useEffect, useRef } from "react";

/** Tiny voxel playground proving the Minecraft session surface is interactive. */
export function VoxelDriftGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const keys = new Set<string>();
    const player = { x: 8, y: 4, z: 8, yaw: 0 };
    const blocks = new Set<string>();

    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        blocks.add(`${x},0,${z}`);
        if ((x + z) % 7 === 0) blocks.add(`${x},1,${z}`);
      }
    }

    function resize() {
      const parent = canvas!.parentElement;
      w = parent?.clientWidth ?? 640;
      h = parent?.clientHeight ?? 360;
      canvas!.width = w * devicePixelRatio;
      canvas!.height = h * devicePixelRatio;
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    const down = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    function project(x: number, y: number, z: number) {
      const dx = x - player.x;
      const dy = y - player.y;
      const dz = z - player.z;
      const cos = Math.cos(player.yaw);
      const sin = Math.sin(player.yaw);
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      const scale = 180 / (rz + 6);
      return {
        sx: w / 2 + rx * scale,
        sy: h / 2 - dy * scale - rz * 8,
        scale,
        depth: rz,
      };
    }

    function drawBlock(x: number, y: number, z: number) {
      const p = project(x + 0.5, y + 0.5, z + 0.5);
      if (p.depth < -4 || p.depth > 18) return;
      const s = Math.max(4, p.scale * 0.55);
      const top = y > 0 ? "#7cffb2" : "#2f9e68";
      const side = y > 0 ? "#2f9e68" : "#1a4a2e";
      ctx!.fillStyle = side;
      ctx!.fillRect(p.sx - s / 2, p.sy - s / 2, s, s);
      ctx!.fillStyle = top;
      ctx!.fillRect(p.sx - s / 2, p.sy - s / 2, s, s * 0.45);
      ctx!.strokeStyle = "rgba(7,17,15,0.35)";
      ctx!.strokeRect(p.sx - s / 2, p.sy - s / 2, s, s);
    }

    function frame(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      if (keys.has("arrowleft") || keys.has("a")) player.yaw -= 2.2 * dt;
      if (keys.has("arrowright") || keys.has("d")) player.yaw += 2.2 * dt;
      const forward = (keys.has("arrowup") || keys.has("w") ? 1 : 0) + (keys.has("arrowdown") || keys.has("s") ? -1 : 0);
      player.x += Math.sin(player.yaw) * forward * 4 * dt;
      player.z += Math.cos(player.yaw) * forward * 4 * dt;
      player.x = Math.max(1, Math.min(14, player.x));
      player.z = Math.max(1, Math.min(14, player.z));

      ctx!.fillStyle = "#081412";
      ctx!.fillRect(0, 0, w, h);
      ctx!.fillStyle = "rgba(124,255,178,0.08)";
      ctx!.fillRect(0, 0, w, h * 0.42);

      const ordered = [...blocks].sort((a, b) => {
        const [ax, , az] = a.split(",").map(Number);
        const [bx, , bz] = b.split(",").map(Number);
        const da = Math.hypot(ax - player.x, az - player.z);
        const db = Math.hypot(bx - player.x, bz - player.z);
        return db - da;
      });
      for (const key of ordered) {
        const [x, y, z] = key.split(",").map(Number);
        drawBlock(x, y, z);
      }

      ctx!.fillStyle = "rgba(158,184,174,0.9)";
      ctx!.font = "12px IBM Plex Mono, monospace";
      ctx!.fillText("WASD / arrows · voxel preview (modded session demo)", 16, h - 16);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-label="Voxel Drift preview canvas"
    />
  );
}
