export type ControlAction =
  | "forward"
  | "back"
  | "left"
  | "right"
  | "jump"
  | "sneak"
  | "sprint"
  | "attack"
  | "use"
  | "inventory"
  | "pause"
  | "hotbar1"
  | "hotbar2"
  | "hotbar3"
  | "hotbar4"
  | "hotbar5"
  | "hotbar6"
  | "hotbar7"
  | "hotbar8"
  | "hotbar9"
  | "drop"
  | "chat";

export type ControlButton = {
  id: string;
  action: ControlAction;
  label: string;
  /** CSS percent within the overlay */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Keyboard code sent to the session (KeyboardEvent.code) */
  keyCode: string;
  style: "pad" | "round" | "pill";
};

export type MobileControlLayout = {
  buttons: ControlButton[];
  opacity: number;
  scale: number;
};

export const MOBILE_LAYOUT_KEY = "playcache-mc-mobile-layout";
export const MOBILE_PREF_KEY = "playcache-mc-mobile-pref";

export const ACTION_LABELS: Record<ControlAction, string> = {
  forward: "Forward",
  back: "Back",
  left: "Left",
  right: "Right",
  jump: "Jump",
  sneak: "Sneak",
  sprint: "Sprint",
  attack: "Attack",
  use: "Use",
  inventory: "Inventory",
  pause: "Pause",
  hotbar1: "Slot 1",
  hotbar2: "Slot 2",
  hotbar3: "Slot 3",
  hotbar4: "Slot 4",
  hotbar5: "Slot 5",
  hotbar6: "Slot 6",
  hotbar7: "Slot 7",
  hotbar8: "Slot 8",
  hotbar9: "Slot 9",
  drop: "Drop",
  chat: "Chat",
};

/** Default KeyboardEvent.code values matching typical Minecraft Java binds. */
export const DEFAULT_KEY_CODES: Record<ControlAction, string> = {
  forward: "KeyW",
  back: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  sneak: "ShiftLeft",
  sprint: "ControlLeft",
  attack: "KeyF", // mapped for browser; real host agent remaps to mouse
  use: "KeyE",
  inventory: "KeyE",
  pause: "Escape",
  hotbar1: "Digit1",
  hotbar2: "Digit2",
  hotbar3: "Digit3",
  hotbar4: "Digit4",
  hotbar5: "Digit5",
  hotbar6: "Digit6",
  hotbar7: "Digit7",
  hotbar8: "Digit8",
  hotbar9: "Digit9",
  drop: "KeyQ",
  chat: "KeyT",
};

export function defaultMobileLayout(): MobileControlLayout {
  return {
    opacity: 0.88,
    scale: 1,
    buttons: [
      { id: "fwd", action: "forward", label: "↑", x: 14, y: 62, w: 12, h: 10, keyCode: "KeyW", style: "round" },
      { id: "left", action: "left", label: "←", x: 4, y: 72, w: 12, h: 10, keyCode: "KeyA", style: "round" },
      { id: "back", action: "back", label: "↓", x: 14, y: 82, w: 12, h: 10, keyCode: "KeyS", style: "round" },
      { id: "right", action: "right", label: "→", x: 24, y: 72, w: 12, h: 10, keyCode: "KeyD", style: "round" },
      { id: "jump", action: "jump", label: "Jump", x: 72, y: 78, w: 22, h: 12, keyCode: "Space", style: "pill" },
      { id: "sneak", action: "sneak", label: "Sneak", x: 58, y: 78, w: 12, h: 12, keyCode: "ShiftLeft", style: "round" },
      { id: "sprint", action: "sprint", label: "Sprint", x: 4, y: 52, w: 14, h: 8, keyCode: "ControlLeft", style: "pill" },
      { id: "attack", action: "attack", label: "Atk", x: 78, y: 58, w: 14, h: 12, keyCode: "KeyF", style: "round" },
      { id: "use", action: "use", label: "Use", x: 64, y: 58, w: 12, h: 12, keyCode: "KeyR", style: "round" },
      { id: "inv", action: "inventory", label: "Inv", x: 86, y: 8, w: 10, h: 8, keyCode: "KeyE", style: "pill" },
      { id: "pause", action: "pause", label: "☰", x: 4, y: 8, w: 10, h: 8, keyCode: "Escape", style: "pill" },
      { id: "drop", action: "drop", label: "Q", x: 86, y: 20, w: 10, h: 8, keyCode: "KeyQ", style: "pill" },
      { id: "chat", action: "chat", label: "Chat", x: 4, y: 20, w: 12, h: 8, keyCode: "KeyT", style: "pill" },
      { id: "h1", action: "hotbar1", label: "1", x: 18, y: 92, w: 7, h: 6, keyCode: "Digit1", style: "pad" },
      { id: "h2", action: "hotbar2", label: "2", x: 26, y: 92, w: 7, h: 6, keyCode: "Digit2", style: "pad" },
      { id: "h3", action: "hotbar3", label: "3", x: 34, y: 92, w: 7, h: 6, keyCode: "Digit3", style: "pad" },
      { id: "h4", action: "hotbar4", label: "4", x: 42, y: 92, w: 7, h: 6, keyCode: "Digit4", style: "pad" },
      { id: "h5", action: "hotbar5", label: "5", x: 50, y: 92, w: 7, h: 6, keyCode: "Digit5", style: "pad" },
      { id: "h6", action: "hotbar6", label: "6", x: 58, y: 92, w: 7, h: 6, keyCode: "Digit6", style: "pad" },
      { id: "h7", action: "hotbar7", label: "7", x: 66, y: 92, w: 7, h: 6, keyCode: "Digit7", style: "pad" },
      { id: "h8", action: "hotbar8", label: "8", x: 74, y: 92, w: 7, h: 6, keyCode: "Digit8", style: "pad" },
      { id: "h9", action: "hotbar9", label: "9", x: 82, y: 92, w: 7, h: 6, keyCode: "Digit9", style: "pad" },
    ],
  };
}

export function readMobileLayout(): MobileControlLayout {
  if (typeof window === "undefined") return defaultMobileLayout();
  try {
    const raw = localStorage.getItem(MOBILE_LAYOUT_KEY);
    if (!raw) return defaultMobileLayout();
    const parsed = JSON.parse(raw) as MobileControlLayout;
    if (!parsed?.buttons?.length) return defaultMobileLayout();
    return {
      opacity: parsed.opacity ?? 0.88,
      scale: parsed.scale ?? 1,
      buttons: parsed.buttons,
    };
  } catch {
    return defaultMobileLayout();
  }
}

export function writeMobileLayout(layout: MobileControlLayout): void {
  localStorage.setItem(MOBILE_LAYOUT_KEY, JSON.stringify(layout));
}

export type MobilePref = {
  /** Force on-screen controls even on desktop */
  forceMobile: boolean;
  showHud: boolean;
};

export function readMobilePref(): MobilePref {
  if (typeof window === "undefined") {
    return { forceMobile: false, showHud: true };
  }
  try {
    const raw = localStorage.getItem(MOBILE_PREF_KEY);
    if (!raw) return { forceMobile: false, showHud: true };
    const parsed = JSON.parse(raw) as Partial<MobilePref>;
    return {
      forceMobile: Boolean(parsed.forceMobile),
      showHud: parsed.showHud !== false,
    };
  } catch {
    return { forceMobile: false, showHud: true };
  }
}

export function writeMobilePref(pref: MobilePref): void {
  localStorage.setItem(MOBILE_PREF_KEY, JSON.stringify(pref));
}

export function codeToDisplay(code: string): string {
  const map: Record<string, string> = {
    Space: "Space",
    ShiftLeft: "LShift",
    ShiftRight: "RShift",
    ControlLeft: "LCtrl",
    ControlRight: "RCtrl",
    AltLeft: "LAlt",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

/** Dispatch a synthetic keyboard event + host-input bus for the remote agent. */
export function emitSessionKey(
  code: string,
  type: "keydown" | "keyup",
): void {
  const key =
    code === "Space"
      ? " "
      : code.startsWith("Key")
        ? code.slice(3).toLowerCase()
        : code.startsWith("Digit")
          ? code.slice(5)
          : code;
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key,
      bubbles: true,
      cancelable: true,
    }),
  );
  // Dynamic import avoided — publish via custom event for host-client subscribers.
  window.dispatchEvent(
    new CustomEvent("playcache-host-input", {
      detail: { type, code, key },
    }),
  );
}
