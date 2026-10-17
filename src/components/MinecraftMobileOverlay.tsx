"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTION_LABELS,
  codeToDisplay,
  defaultMobileLayout,
  emitSessionKey,
  readMobileLayout,
  type ControlButton,
  type MobileControlLayout,
  writeMobileLayout,
} from "@/lib/mobile-controls";

const HOTBAR_ITEMS = ["⛏", "🪓", " Tor", "🍞", "🗡", "🏹", "🧱", "🪣", "💎"];

export function MinecraftMobileOverlay({
  active,
  showHud,
}: {
  active: boolean;
  showHud: boolean;
}) {
  const [layout, setLayout] = useState<MobileControlLayout>(() =>
    readMobileLayout(),
  );
  const [customize, setCustomize] = useState(false);
  const [rebindId, setRebindId] = useState<string | null>(null);
  const [selectedHotbar, setSelectedHotbar] = useState(0);
  const [health] = useState(20);
  const [hunger] = useState(18);
  const [xp] = useState(0.42);
  const [level] = useState(17);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const pressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    writeMobileLayout(layout);
  }, [layout]);

  useEffect(() => {
    if (!rebindId) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setLayout((prev) => ({
        ...prev,
        buttons: prev.buttons.map((b) =>
          b.id === rebindId ? { ...b, keyCode: e.code } : b,
        ),
      }));
      setRebindId(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [rebindId]);

  const press = useCallback((btn: ControlButton) => {
    if (pressed.current.has(btn.id)) return;
    pressed.current.add(btn.id);
    emitSessionKey(btn.keyCode, "keydown");
    if (btn.action.startsWith("hotbar")) {
      const idx = Number(btn.action.replace("hotbar", "")) - 1;
      if (!Number.isNaN(idx)) setSelectedHotbar(idx);
    }
  }, []);

  const release = useCallback((btn: ControlButton) => {
    if (!pressed.current.has(btn.id)) return;
    pressed.current.delete(btn.id);
    emitSessionKey(btn.keyCode, "keyup");
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none touch-none">
      {showHud ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[18%] flex flex-col items-center gap-1 px-3">
          <div className="flex items-end gap-6">
            <HeartRow value={health} />
            <div className="mb-1 font-mono text-xs text-signal">{level}</div>
            <HungerRow value={hunger} />
          </div>
          <div className="relative h-1.5 w-56 overflow-hidden rounded-sm bg-black/50">
            <span
              className="absolute inset-y-0 left-0 bg-[#7cffb2]"
              style={{ width: `${xp * 100}%` }}
            />
          </div>
          <div className="mt-1 flex gap-0.5 rounded-sm border-2 border-black/70 bg-black/45 p-0.5">
            {HOTBAR_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex h-9 w-9 items-center justify-center border text-sm ${
                  i === selectedHotbar
                    ? "border-white bg-white/15"
                    : "border-black/40 bg-[#3a3a3a]/80"
                }`}
              >
                <span aria-hidden>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80" />
      </div>

      <div className="pointer-events-auto absolute right-2 top-2 z-30 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="rounded-sm border border-line bg-ink/80 px-2 py-1 font-mono text-[10px] text-paper"
          onClick={() => {
            setCustomize((c) => !c);
            setRebindId(null);
          }}
        >
          {customize ? "Done" : "Edit controls"}
        </button>
        {customize ? (
          <>
            <button
              type="button"
              className="rounded-sm border border-line bg-ink/80 px-2 py-1 font-mono text-[10px] text-ember"
              onClick={() => setLayout(defaultMobileLayout())}
            >
              Reset layout
            </button>
            <label className="flex items-center gap-1 rounded-sm border border-line bg-ink/80 px-2 py-1 font-mono text-[10px]">
              Opacity
              <input
                type="range"
                min={0.35}
                max={1}
                step={0.05}
                value={layout.opacity}
                onChange={(e) =>
                  setLayout((p) => ({
                    ...p,
                    opacity: Number(e.target.value),
                  }))
                }
              />
            </label>
          </>
        ) : null}
      </div>

      {rebindId ? (
        <div className="pointer-events-none absolute inset-x-0 top-12 z-30 text-center">
          <span className="rounded-sm border border-signal bg-ink/90 px-3 py-1 font-mono text-xs text-signal">
            Press any key to bind…
          </span>
        </div>
      ) : null}

      {customize ? (
        <p className="pointer-events-none absolute inset-x-0 top-20 z-20 text-center font-mono text-[10px] text-fog">
          Drag to move · tap to rebind key
        </p>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: layout.opacity }}
      >
        {layout.buttons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            className={`pointer-events-auto absolute flex items-center justify-center border border-white/25 bg-black/45 font-mono text-paper shadow-sm backdrop-blur-[2px] active:bg-signal/30 ${
              btn.style === "round"
                ? "rounded-full text-sm"
                : btn.style === "pill"
                  ? "rounded-md text-[10px] uppercase tracking-wide"
                  : "rounded-sm text-[10px]"
            } ${customize ? "ring-1 ring-signal/50" : ""} ${
              rebindId === btn.id ? "ring-2 ring-ember" : ""
            }`}
            style={{
              left: `${btn.x}%`,
              top: `${btn.y}%`,
              width: `${btn.w}%`,
              height: `${btn.h}%`,
            }}
            aria-label={`${ACTION_LABELS[btn.action]} (${codeToDisplay(btn.keyCode)})`}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLButtonElement).setPointerCapture(
                e.pointerId,
              );
              if (customize) {
                dragRef.current = {
                  id: btn.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  lastX: e.clientX,
                  lastY: e.clientY,
                  moved: false,
                };
                return;
              }
              press(btn);
            }}
            onPointerMove={(e) => {
              const drag = dragRef.current;
              if (!customize || !drag || drag.id !== btn.id) return;
              const parent = e.currentTarget.parentElement;
              if (!parent) return;
              const rect = parent.getBoundingClientRect();
              const dx = ((e.clientX - drag.lastX) / rect.width) * 100;
              const dy = ((e.clientY - drag.lastY) / rect.height) * 100;
              const dist = Math.hypot(
                e.clientX - drag.startX,
                e.clientY - drag.startY,
              );
              dragRef.current = {
                ...drag,
                lastX: e.clientX,
                lastY: e.clientY,
                moved: drag.moved || dist > 10,
              };
              setLayout((prev) => ({
                ...prev,
                buttons: prev.buttons.map((b) =>
                  b.id === btn.id
                    ? {
                        ...b,
                        x: Math.min(92, Math.max(0, b.x + dx)),
                        y: Math.min(92, Math.max(0, b.y + dy)),
                      }
                    : b,
                ),
              }));
            }}
            onPointerUp={() => {
              if (customize) {
                const drag = dragRef.current;
                dragRef.current = null;
                if (drag && !drag.moved) setRebindId(btn.id);
                return;
              }
              release(btn);
            }}
            onPointerCancel={() => {
              if (!customize) release(btn);
              dragRef.current = null;
            }}
          >
            <span className="leading-none">
              {btn.label}
              {customize ? (
                <span className="mt-0.5 block text-[8px] text-signal">
                  {codeToDisplay(btn.keyCode)}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeartRow({ value }: { value: number }) {
  const full = Math.floor(value / 2);
  const half = value % 2 === 1;
  return (
    <div className="flex gap-0.5" aria-label={`Health ${value}`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="text-[11px] leading-none"
          style={{
            color:
              i < full
                ? "#ff4d4d"
                : i === full && half
                  ? "#ff8a8a"
                  : "rgba(0,0,0,0.45)",
            textShadow: "0 1px 0 #000",
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}

function HungerRow({ value }: { value: number }) {
  const full = Math.floor(value / 2);
  const half = value % 2 === 1;
  return (
    <div className="flex gap-0.5" aria-label={`Hunger ${value}`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="text-[11px] leading-none"
          style={{
            color:
              i < full
                ? "#c4a35a"
                : i === full && half
                  ? "#e0c98a"
                  : "rgba(0,0,0,0.45)",
            textShadow: "0 1px 0 #000",
          }}
        >
          ◉
        </span>
      ))}
    </div>
  );
}
