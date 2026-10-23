import Phaser from "phaser";
import { touchHeld, touchTapped } from "./touch";

type Action = "left" | "right" | "up" | "down" | "jump" | "sprint" | "confirm" | "back" | "pause" | "mute";
type State = Record<Action, boolean>;

// Arrows move; S sprints and D jumps so a kid can hold sprint and tap jump with one hand.
const KEYS: Record<Action, string[]> = {
  left: ["LEFT"],
  right: ["RIGHT"],
  up: ["UP"],
  down: ["DOWN"],
  jump: ["SPACE", "D", "UP", "Z"],
  sprint: ["S", "SHIFT"],
  confirm: ["ENTER", "SPACE", "D", "Z"],
  back: ["ESC", "BACKSPACE", "X"],
  pause: ["ESC", "P"],
  mute: ["M"],
};

// Standard gamepad mapping: 0 = A/Cross, 1 = B/Circle, 2 = X/Square, 5 = RB, 9 = Start, 12-15 = d-pad.
const PAD_BUTTONS: Record<Action, number[]> = {
  left: [14],
  right: [15],
  up: [12],
  down: [13],
  jump: [0, 1],
  sprint: [2, 5],
  confirm: [0, 9],
  back: [1],
  pause: [9],
  mute: [],
};

const STICK_DEADZONE = 0.4;
const ACTIONS = Object.keys(KEYS) as Action[];

/** Keyboard and gamepad merged into one set of actions, with per-frame edge detection. */
export class Controls {
  private keys: Map<string, Phaser.Input.Keyboard.Key>;
  private current: State;
  private previous: State;
  /** Keys pressed since the last update; catches taps shorter than a frame. */
  private tapped = new Set<number>();

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const names = new Set(ACTIONS.flatMap((a) => KEYS[a]));
    this.keys = new Map([...names].map((n) => [n, kb.addKey(n, true)]));
    const onDown = (e: KeyboardEvent) => this.tapped.add(e.keyCode);
    kb.on("keydown", onDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off("keydown", onDown));
    // Prime both states so a button still held from the previous scene doesn't fire.
    this.current = this.read();
    this.previous = { ...this.current };
  }

  /** Forget edges, e.g. when a scene resumes while a button is still held. */
  reset(): void {
    this.tapped.clear();
    touchTapped.clear();
    this.current = this.read();
    this.previous = { ...this.current };
  }

  /** Call once at the start of each update. */
  update(): void {
    this.previous = this.current;
    this.current = this.read();
    for (const action of ACTIONS) {
      if (KEYS[action].some((k) => this.tapped.has(this.keys.get(k)!.keyCode))) {
        this.current[action] = true;
        this.previous[action] = false;
      }
    }
    for (const action of ACTIONS) {
      if (touchTapped.has(action)) {
        this.current[action] = true;
        this.previous[action] = false;
      }
    }
    this.tapped.clear();
    touchTapped.clear();
  }

  held(action: Action): boolean {
    return this.current[action];
  }

  pressed(action: Action): boolean {
    return this.current[action] && !this.previous[action];
  }

  private read(): State {
    const pad = this.pad();
    const state = {} as State;
    for (const action of ACTIONS) {
      state[action] =
        KEYS[action].some((k) => this.keys.get(k)!.isDown) ||
        touchHeld.has(action) ||
        (pad !== undefined && PAD_BUTTONS[action].some((b) => pad.buttons[b]?.pressed));
    }
    if (pad) {
      const x = pad.axes[0]?.getValue() ?? 0;
      const y = pad.axes[1]?.getValue() ?? 0;
      state.left ||= x < -STICK_DEADZONE;
      state.right ||= x > STICK_DEADZONE;
      state.up ||= y < -STICK_DEADZONE;
      state.down ||= y > STICK_DEADZONE;
    }
    return state;
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | undefined {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return undefined;
    return gp.getAll().find((p) => p.connected);
  }
}
