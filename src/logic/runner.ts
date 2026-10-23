/** Pacing for MTB Trail. Speeds in px/s, times in seconds. */
export const RUN = {
  startSpeed: 170,
  maxSpeed: 480,
  /** Speed gained per second of running: top speed after about 80 s. */
  acceleration: 4,
  hearts: 3,
};

export function speedAt(seconds: number): number {
  return Math.min(RUN.maxSpeed, RUN.startSpeed + RUN.acceleration * seconds);
}

/**
 * Free distance (px) between two obstacles. The minimum leaves room to land a full jump
 * (~0.82 s in the air) and take off again.
 */
export function gapRange(speed: number): [number, number] {
  return [Math.max(150, speed * 0.95), Math.max(260, speed * 1.5)];
}

/** Extra run-out (px) after a ramp so a popped jump (~1.1 s) doesn't land on the next obstacle. */
export function rampRunOut(speed: number): number {
  return speed * 0.6;
}

export type Pattern =
  | "rock"
  | "rocks"
  | "log"
  | "logPile"
  | "stump"
  | "walker"
  | "hopper"
  | "spiky"
  | "walkerPair"
  | "diamondArc"
  | "rockUnderDiamonds"
  | "kicker"
  | "bigKicker"
  | "kickerGap"
  | "gap"
  | "rampOverLog"
  | "rampOverRocks"
  | "rockThenLog"
  | "logThenWalker"
  | "gapThenRock";

const UNLOCKS: [number, Pattern[]][] = [
  [0, ["rock", "log", "stump", "walker", "diamondArc", "kicker"]],
  [8, ["kickerGap", "rocks", "rockUnderDiamonds", "rampOverLog"]],
  [18, ["hopper", "bigKicker", "logPile", "rockThenLog"]],
  [30, ["gap", "logThenWalker", "rampOverRocks"]],
  [45, ["spiky", "gapThenRock"]],
  [60, ["walkerPair"]],
];

/**
 * Kicker ramps: length and height in px, and the upward speed of a jump pressed on them.
 * The surface is curved (height grows with the square of the distance), so it steepens to the lip.
 */
export const RAMPS = {
  small: { length: 44, height: 20, launch: 470 },
  big: { length: 66, height: 32, launch: 540 },
} as const;

type RampShape = { length: number; height: number };

/** Surface height at `t` (0 bottom, 1 lip) along a kicker. */
export function rampHeightAt(ramp: RampShape, t: number): number {
  return ramp.height * t * t;
}

/** Rise per pixel forward at `t` along a kicker. */
export function rampSlopeAt(ramp: RampShape, t: number): number {
  return (2 * ramp.height * t) / ramp.length;
}

/** Share of the lip's steepness kept as upward speed when rolling off without jumping. */
export const ROLL_OFF = 0.7;

/** Upward speed when rolling off a kicker's lip at `speed` without jumping: a small natural kick. */
export function rollOffSpeed(ramp: RampShape, speed: number): number {
  return speed * rampSlopeAt(ramp, 1) * ROLL_OFF;
}

/** How far past the lip (px) a bike rolling off at `speed` comes back down, under `gravity`. */
export function rollOffDistance(ramp: RampShape, speed: number, gravity: number): number {
  const vy = rollOffSpeed(ramp, speed);
  const airtime = (vy + Math.sqrt(vy * vy + 2 * gravity * ramp.height)) / gravity;
  return speed * airtime;
}
/** Extra launch speed for a jump pressed near the top of a ramp. */
export const RAMP_JUMP_BOOST = 70;
/** How far up the ramp (0 bottom, 1 lip) a jump counts as a perfect pop. */
export const PERFECT_POP_FROM = 0.65;

/** Upward speed when jumping on a ramp at `progress` (0..1) along it. Without a jump the bike just rolls off. */
export function rampPop(launch: number, progress: number): number {
  return launch + (progress >= PERFECT_POP_FROM ? RAMP_JUMP_BOOST : 0);
}

/** Nose-up angle (degrees) of a wheelie. */
export const WHEELIE_ANGLE = 28;

/** Points for a wheelie held this long; short ones earn nothing. */
export function wheelieBonus(seconds: number): number {
  return seconds < 0.5 ? 0 : Math.floor(seconds * 10);
}

/** Bonus points for time in the air after a ramp jump, or 0. An early pop off the small kicker (~1 s) earns nothing. */
export function airBonus(seconds: number): number {
  if (seconds >= 1.25) return 30;
  if (seconds >= 1.1) return 15;
  return 0;
}

export function availablePatterns(seconds: number): Pattern[] {
  return UNLOCKS.filter(([at]) => seconds >= at).flatMap(([, p]) => p);
}

/** Spin speed (degrees/s) while holding left or right in the air. */
export const FLIP_SPEED = 480;
/** Speed (degrees/s) the bike levels itself out at when not spinning. */
export const LEVEL_OUT_SPEED = 260;
/** How far from upright (degrees) a landing may be without crashing. */
export const LAND_TOLERANCE = 45;
export const FLIP_POINTS = 50;

/** Angle after levelling out toward the nearest upright position (any whole number of turns). */
export function levelOut(tilt: number, dt: number): number {
  const upright = Math.round(tilt / 360) * 360 + 0; // + 0 turns -0 into 0
  const step = LEVEL_OUT_SPEED * dt;
  return Math.abs(upright - tilt) <= step ? upright : tilt + Math.sign(upright - tilt) * step;
}

/** Judges a landing at `tilt` degrees (negative = rotated backwards). `flips` is signed: negative are backflips. */
export function landing(tilt: number): { crashed: boolean; flips: number } {
  const turns = Math.round(tilt / 360) + 0;
  const crashed = Math.abs(tilt - turns * 360) > LAND_TOLERANCE;
  return { crashed, flips: crashed ? 0 : turns };
}

export function flipName(flips: number): string {
  const kind = flips < 0 ? "backflip" : "frontflip";
  const count = Math.abs(flips);
  const prefix = count === 1 ? "" : count === 2 ? "Double " : count === 3 ? "Triple " : `${count}x `;
  const name = `${prefix}${kind}`;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** How many pixels the suspension sinks on landing, from the falling speed (px/s). */
export function sagFor(fallSpeed: number): 1 | 2 | 3 {
  if (fallSpeed > 480) return 3;
  if (fallSpeed > 280) return 2;
  return 1;
}
