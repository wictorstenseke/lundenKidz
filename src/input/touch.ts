/**
 * On-screen touch controls (iPad/phone): feeds `touch` into Controls like a gamepad would.
 * Menus get a small d-pad plus A/B. In game the left half of the screen is a floating stick that
 * appears under the finger, the right half jumps, and Run is a toggle that stays on.
 */
import { audio } from "../audio/audio";
import { knobOffset, STICK_RADIUS, stickDirection, touchZone, type StickDirection } from "./stick";

export type TouchAction = "left" | "right" | "up" | "down" | "jump" | "sprint" | "confirm" | "back" | "pause";
export type TouchLayout = "menu" | "game";

/** Buttons currently held, and taps since Controls last looked (so a tap shorter than a frame still counts). */
export const touchHeld = new Set<string>();
export const touchTapped = new Set<string>();

const SPRINT_KEY = "lundenKidz.touchSprint";

interface Button {
  label: string;
  actions: TouchAction[];
  cls: string;
  /** Which layout shows it; undefined = both. */
  layout?: TouchLayout;
}

const BUTTONS: Button[] = [
  { label: "<", actions: ["left"], cls: "left", layout: "menu" },
  { label: ">", actions: ["right"], cls: "right", layout: "menu" },
  { label: "^", actions: ["up"], cls: "up", layout: "menu" },
  { label: "v", actions: ["down"], cls: "down", layout: "menu" },
  { label: "A", actions: ["confirm", "jump"], cls: "a", layout: "menu" },
  { label: "B", actions: ["back"], cls: "b", layout: "menu" },
  { label: "II", actions: ["pause"], cls: "pause", layout: "game" },
];

// Pixel look: no border-radius; the 4px box-shadow ring gives notched corners like a sprite frame.
const CSS = `
#touch[hidden] { display: none; }
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 10; font-family: PressStart2P, monospace; color: #fff; }
#touch * { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
#touch[data-layout="menu"] .game-only, #touch[data-layout="game"] .menu-only { display: none; }

#touch .px { background: rgba(29,27,42,.72); box-shadow: 0 -4px 0 0 #fff, 0 4px 0 0 #fff, -4px 0 0 0 #fff, 4px 0 0 0 #fff; }
#touch button.px { position: absolute; pointer-events: auto; border: 0; padding: 0; color: #fff; font: inherit; font-size: 18px; line-height: 1; margin: 4px; }
#touch button.px.on { background: #ffe066; color: #1d1b2a; transform: translateY(3px); }

#touch .left  { left: calc(env(safe-area-inset-left) + 16px);  bottom: calc(env(safe-area-inset-bottom) + 64px); width: 52px; height: 52px; }
#touch .right { left: calc(env(safe-area-inset-left) + 136px); bottom: calc(env(safe-area-inset-bottom) + 64px); width: 52px; height: 52px; }
#touch .up    { left: calc(env(safe-area-inset-left) + 76px);  bottom: calc(env(safe-area-inset-bottom) + 124px); width: 52px; height: 52px; }
#touch .down  { left: calc(env(safe-area-inset-left) + 76px);  bottom: calc(env(safe-area-inset-bottom) + 4px);  width: 52px; height: 52px; }
#touch .a { right: calc(env(safe-area-inset-right) + 16px);  bottom: calc(env(safe-area-inset-bottom) + 72px); width: 64px; height: 64px; font-size: 22px; }
#touch .b { right: calc(env(safe-area-inset-right) + 96px);  bottom: calc(env(safe-area-inset-bottom) + 40px); width: 56px; height: 56px; }
#touch .pause { right: calc(env(safe-area-inset-right) + 16px); top: calc(env(safe-area-inset-top) + 16px); width: 44px; height: 44px; font-size: 14px; }

#touch .zone { position: absolute; inset: 0; pointer-events: auto; }

#touch .stick, #touch .tap { position: absolute; pointer-events: none; display: none; }
#touch .stick { width: 104px; height: 104px; display: none; }
#touch .stick.on, #touch .tap.on { display: block; }
#touch .stick .rim { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 16px; color: rgba(255,255,255,.55); }
#touch .knob { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; background: #ffe066; box-shadow: 0 -4px 0 0 #1d1b2a, 0 4px 0 0 #1d1b2a, -4px 0 0 0 #1d1b2a, 4px 0 0 0 #1d1b2a; }
#touch .knob::after { content: ""; position: absolute; left: 6px; top: 6px; width: 10px; height: 6px; background: #fff7c2; }
#touch .tap { width: 64px; height: 64px; display: none; align-items: center; justify-content: center; font-size: 11px; color: #ffe066; }
#touch .tap.on { display: flex; }

#touch .sprint { position: absolute; pointer-events: auto; right: calc(env(safe-area-inset-right) + 84px); top: calc(env(safe-area-inset-top) + 20px); display: flex; align-items: center; gap: 10px; border: 0; padding: 0 8px; height: 36px; font: inherit; font-size: 12px; color: #fff; }
#touch .sprint .box { width: 20px; height: 20px; background: #1d1b2a; box-shadow: 0 -3px 0 0 #fff, 0 3px 0 0 #fff, -3px 0 0 0 #fff, 3px 0 0 0 #fff; margin: 3px; position: relative; }
#touch .sprint[aria-pressed="true"] .box::after { content: ""; position: absolute; inset: 4px; background: #ffe066; }
`;

let root: HTMLDivElement | undefined;
let stickEl: HTMLDivElement | undefined;
let knobEl: HTMLDivElement | undefined;
let tapEl: HTMLDivElement | undefined;
let sprintEl: HTMLButtonElement | undefined;
let sprintOn = true;

/** The finger on the stick, where it landed, and the direction it currently holds. */
let stickPointer: number | undefined;
let stickOrigin = { x: 0, y: 0 };
let stickDir: StickDirection | undefined;
let jumpPointer: number | undefined;

/** True once the on-screen controls exist, i.e. this is a touch device. */
export function hasTouchControls(): boolean {
  return root !== undefined;
}

/** Called by Controls when a scene starts or resumes, so the right set of controls shows. */
export function setTouchLayout(layout: TouchLayout): void {
  if (!root) return;
  root.dataset.layout = layout;
  releaseStick();
  releaseJump();
  touchHeld.clear();
  touchTapped.clear();
  if (layout === "game" && sprintOn) touchHeld.add("sprint");
}

/** Adds the controls if the device has a touchscreen as its main pointer. */
export function installTouchControls(): void {
  if (!matchMedia("(pointer: coarse)").matches) return;
  sprintOn = localStorage.getItem(SPRINT_KEY) !== "off";

  const style = document.createElement("style");
  style.textContent = CSS;
  root = document.createElement("div");
  root.id = "touch";
  root.dataset.layout = "menu";
  root.addEventListener("pointerdown", () => audio.unlock());
  root.addEventListener("contextmenu", (e) => e.preventDefault());

  root.append(zone());
  for (const b of BUTTONS) root.append(button(b));
  root.append(sprintToggle());

  document.head.append(style);
  document.body.append(root);
  // A paired controller takes over; the controls come back if it disconnects.
  const sync = () => (root!.hidden = [...navigator.getGamepads()].some((g) => g?.connected));
  addEventListener("gamepadconnected", sync);
  addEventListener("gamepaddisconnected", sync);
}

function button(b: Button): HTMLButtonElement {
  const el = document.createElement("button");
  el.textContent = b.label;
  el.className = `px ${b.cls} ${b.layout ? `${b.layout}-only` : ""}`;
  el.setAttribute("aria-label", b.actions[0]);
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
  return el;
}

function sprintToggle(): HTMLButtonElement {
  sprintEl = document.createElement("button");
  sprintEl.className = "sprint px game-only";
  sprintEl.setAttribute("aria-label", "Run");
  const box = document.createElement("span");
  box.className = "box";
  sprintEl.append(box, document.createTextNode("RUN"));
  sprintEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    setSprint(!sprintOn);
  });
  setSprint(sprintOn);
  return sprintEl;
}

function setSprint(on: boolean): void {
  sprintOn = on;
  sprintEl?.setAttribute("aria-pressed", String(on));
  localStorage.setItem(SPRINT_KEY, on ? "on" : "off");
  if (on) touchHeld.add("sprint");
  else touchHeld.delete("sprint");
}

/** Full-screen surface shown in game: left half is the stick, right half jumps. */
function zone(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "zone game-only";

  stickEl = document.createElement("div");
  stickEl.className = "stick px";
  const rim = document.createElement("div");
  rim.className = "rim";
  for (const arrow of ["<", ">"]) {
    const span = document.createElement("span");
    span.textContent = arrow;
    rim.append(span);
  }
  knobEl = document.createElement("div");
  knobEl.className = "knob";
  stickEl.append(rim, knobEl);

  tapEl = document.createElement("div");
  tapEl.className = "tap px";
  tapEl.textContent = "JUMP";
  el.append(stickEl, tapEl);

  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (touchZone(e.clientX, innerWidth) === "move") {
      if (stickPointer !== undefined) return;
      el.setPointerCapture(e.pointerId);
      stickPointer = e.pointerId;
      stickOrigin = { x: e.clientX, y: e.clientY };
      stickEl!.style.left = `${e.clientX - 52}px`;
      stickEl!.style.top = `${e.clientY - 52}px`;
      knobEl!.style.transform = "";
      stickEl!.classList.add("on");
    } else {
      if (jumpPointer !== undefined) return;
      el.setPointerCapture(e.pointerId);
      jumpPointer = e.pointerId;
      tapEl!.style.left = `${e.clientX - 32}px`;
      tapEl!.style.top = `${e.clientY - 32}px`;
      tapEl!.classList.add("on");
      touchHeld.add("jump");
      touchTapped.add("jump");
    }
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerId !== stickPointer) return;
    const dx = e.clientX - stickOrigin.x;
    const dy = e.clientY - stickOrigin.y;
    const k = knobOffset(dx, dy, STICK_RADIUS);
    knobEl!.style.transform = `translate(${k.x}px, ${k.y}px)`;
    setStickDir(stickDirection(dx));
  });
  const up = (e: PointerEvent) => {
    if (e.pointerId === stickPointer) releaseStick();
    if (e.pointerId === jumpPointer) releaseJump();
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  return el;
}

function setStickDir(dir: StickDirection | undefined): void {
  if (dir === stickDir) return;
  if (stickDir) touchHeld.delete(stickDir);
  stickDir = dir;
  if (dir) {
    touchHeld.add(dir);
    touchTapped.add(dir);
  }
}

function releaseStick(): void {
  stickPointer = undefined;
  setStickDir(undefined);
  stickEl?.classList.remove("on");
}

function releaseJump(): void {
  jumpPointer = undefined;
  touchHeld.delete("jump");
  tapEl?.classList.remove("on");
}
