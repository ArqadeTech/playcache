"use client";

import { useEffect, useRef } from "react";

export function OrbitDriftGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const ship = { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2 };
    const keys = new Set<string>();
    const stars: Array<{ x: number; y: number; z: number }> = [];

    function resize() {
      const parent = canvas!.parentElement;
      width = parent?.clientWidth ?? 640;
      height = parent?.clientHeight ?? 360;
      canvas!.width = width * devicePixelRatio;
      canvas!.height = height * devicePixelRatio;
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ship.x = width * 0.5;
      ship.y = height * 0.55;
      stars.length = 0;
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: 0.3 + Math.random() * 0.7,
        });
      }
    }

    function onKey(e: KeyboardEvent, down: boolean) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (down) keys.add(e.key.toLowerCase());
      else keys.delete(e.key.toLowerCase());
    }

    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const left = keys.has("arrowleft") || keys.has("a");
      const right = keys.has("arrowright") || keys.has("d");
      const thrust = keys.has("arrowup") || keys.has("w") || keys.has(" ");

      if (left) ship.a -= 3.2 * dt;
      if (right) ship.a += 3.2 * dt;
      if (thrust) {
        ship.vx += Math.cos(ship.a) * 220 * dt;
        ship.vy += Math.sin(ship.a) * 220 * dt;
      }
      ship.vx *= 0.995;
      ship.vy *= 0.995;
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      if (ship.x < 0) ship.x += width;
      if (ship.x > width) ship.x -= width;
      if (ship.y < 0) ship.y += height;
      if (ship.y > height) ship.y -= height;

      ctx!.fillStyle = "#050c0a";
      ctx!.fillRect(0, 0, width, height);

      for (const s of stars) {
        ctx!.fillStyle = `rgba(232,255,242,${0.25 + s.z * 0.55})`;
        ctx!.fillRect(s.x, s.y, s.z * 2, s.z * 2);
      }

      const cx = width * 0.72;
      const cy = height * 0.38;
      ctx!.strokeStyle = "rgba(124,255,178,0.25)";
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, 90, 28, 0.2, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, 55, 16, 0.2, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.fillStyle = "#e8fff2";
      ctx!.beginPath();
      ctx!.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.save();
      ctx!.translate(ship.x, ship.y);
      ctx!.rotate(ship.a);
      ctx!.fillStyle = "#7cffb2";
      ctx!.beginPath();
      ctx!.moveTo(14, 0);
      ctx!.lineTo(-10, 8);
      ctx!.lineTo(-6, 0);
      ctx!.lineTo(-10, -8);
      ctx!.closePath();
      ctx!.fill();
      if (thrust) {
        ctx!.fillStyle = "#ffb86b";
        ctx!.beginPath();
        ctx!.moveTo(-10, 0);
        ctx!.lineTo(-18 - Math.random() * 6, 3);
        ctx!.lineTo(-18 - Math.random() * 6, -3);
        ctx!.fill();
      }
      ctx!.restore();

      ctx!.fillStyle = "rgba(158,184,174,0.85)";
      ctx!.font = "12px IBM Plex Mono, monospace";
      ctx!.fillText("WASD / arrows · space thrust", 16, height - 16);

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
      aria-label="Orbit Drift game canvas"
    />
  );
}
