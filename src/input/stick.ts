/** Pure math for the floating touch stick and the in-game touch zones. */

/** How far the knob can travel from where the finger first landed, in CSS px. */
export const STICK_RADIUS = 36;
/** Horizontal drag before left/right registers, so a resting thumb doesn't walk. */
export const STICK_DEADZONE = 10;

export type StickDirection = "left" | "right";

/** Horizontal finger offset from the stick's origin → direction, or none inside the dead zone. */
export function stickDirection(dx: number, deadzone = STICK_DEADZONE): StickDirection | undefined {
  if (dx > deadzone) return "right";
  if (dx < -deadzone) return "left";
  return undefined;
}

/** Where to draw the knob: the finger offset, clamped to the stick's rim. */
export function knobOffset(dx: number, dy: number, radius = STICK_RADIUS): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len <= radius) return { x: dx, y: dy };
  const k = radius / len;
  return { x: dx * k, y: dy * k };
}

export type TouchZone = "move" | "jump";

/** Left half of the screen moves, right half jumps. */
export function touchZone(x: number, screenWidth: number): TouchZone {
  return x < screenWidth / 2 ? "move" : "jump";
}
