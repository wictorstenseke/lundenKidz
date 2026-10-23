/** On-screen buttons for touch devices (iPad): feeds `touch` into Controls like a gamepad would. */
export type TouchAction = "left" | "right" | "up" | "down" | "jump" | "sprint" | "confirm" | "pause";

/** Buttons currently held, and taps since Controls last looked (so a tap shorter than a frame still counts). */
export const touchHeld = new Set<string>();
export const touchTapped = new Set<string>();

interface Button {
  label: string;
  actions: TouchAction[];
  cls: string;
}

const BUTTONS: Button[] = [
  { label: "◀", actions: ["left"], cls: "left" },
  { label: "▶", actions: ["right"], cls: "right" },
  { label: "▲", actions: ["up"], cls: "up" },
  { label: "▼", actions: ["down"], cls: "down" },
  { label: "Jump", actions: ["jump", "confirm"], cls: "jump" },
  { label: "Run", actions: ["sprint"], cls: "sprint" },
  { label: "❚❚", actions: ["pause"], cls: "pause" },
];

const CSS = `
#touch[hidden] { display: none; }
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 10; }
#touch button {
  position: absolute; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none;
  -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
  border: 3px solid rgba(255,255,255,.55); background: rgba(29,27,42,.45); color: #fff;
  font: 700 22px system-ui, sans-serif; border-radius: 50%; width: 76px; height: 76px; padding: 0;
}
#touch button.on { background: rgba(255,255,255,.4); }
#touch .left  { left: calc(env(safe-area-inset-left) + 16px);  bottom: calc(env(safe-area-inset-bottom) + 56px); }
#touch .right { left: calc(env(safe-area-inset-left) + 188px); bottom: calc(env(safe-area-inset-bottom) + 56px); }
#touch .up    { left: calc(env(safe-area-inset-left) + 102px); bottom: calc(env(safe-area-inset-bottom) + 118px); width: 58px; height: 58px; }
#touch .down  { left: calc(env(safe-area-inset-left) + 102px); bottom: calc(env(safe-area-inset-bottom) + 8px);   width: 58px; height: 58px; }
#touch .jump  { right: calc(env(safe-area-inset-right) + 16px); bottom: calc(env(safe-area-inset-bottom) + 56px); width: 104px; height: 104px; }
#touch .sprint { right: calc(env(safe-area-inset-right) + 138px); bottom: calc(env(safe-area-inset-bottom) + 40px); }
#touch .pause { right: calc(env(safe-area-inset-right) + 12px); top: calc(env(safe-area-inset-top) + 12px); width: 52px; height: 52px; font-size: 16px; }
`;

/** Adds the buttons if the device has a touchscreen as its main pointer. */
export function installTouchControls(): void {
  if (!matchMedia("(pointer: coarse)").matches) return;
  const style = document.createElement("style");
  style.textContent = CSS;
  const root = document.createElement("div");
  root.id = "touch";
  for (const b of BUTTONS) {
    const el = document.createElement("button");
    el.textContent = b.label;
    el.className = b.cls;
    el.setAttribute("aria-label", b.label);
    const down = (e: PointerEvent) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add("on");
      for (const a of b.actions) {
        touchHeld.add(a);
        touchTapped.add(a);
      }
    };
    const up = () => {
      el.classList.remove("on");
      for (const a of b.actions) touchHeld.delete(a);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    root.append(el);
  }
  document.head.append(style);
  document.body.append(root);
  // A paired controller takes over; the buttons come back if it disconnects.
  const sync = () => (root.hidden = [...navigator.getGamepads()].some((g) => g?.connected));
  addEventListener("gamepadconnected", sync);
  addEventListener("gamepaddisconnected", sync);
}
