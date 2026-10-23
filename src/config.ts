export const TILE = 18;
export const GAME_WIDTH = 1152;
export const GAME_HEIGHT = 648;
/** World pixels are drawn this many screen pixels wide, giving a 384x216 view: a whole Level is 12 tiles (216px) tall. */
export const ZOOM = 3;

export const PHYSICS = {
  gravity: 1000,
  walkSpeed: 115,
  /** Top speed while sprint is held. */
  runSpeed: 185,
  /** How quickly horizontal speed reaches the target, per second. */
  acceleration: 14,
  jumpVelocity: 410,
  /** Upward speed is multiplied by this when jump is released early. */
  jumpCut: 0.45,
  /** Upward speed from a spring: about 10 tiles high. */
  springVelocity: 600,
  stompBounce: 260,
  stompBounceHeld: 420,
  knockbackX: 150,
  knockbackY: 220,
  knockbackLockMs: 250,
  coyoteMs: 110,
  jumpBufferMs: 130,
};

export const FONT = "PressStart2P";

export const SCENES = {
  boot: "Boot",
  title: "Title",
  select: "CharacterSelect",
  game: "Game",
  hud: "Hud",
  pause: "Pause",
  complete: "LevelComplete",
  victory: "Victory",
  runner: "Runner",
  runnerOver: "RunnerOver",
} as const;
