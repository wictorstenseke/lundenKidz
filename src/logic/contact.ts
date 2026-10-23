/** How far (px) the Player's feet may already sink into an Enemy and still count as a Stomp. */
export const STOMP_TOLERANCE = 6;

export type ContactOutcome = "stomp" | "hurt";

export interface Contact {
  /** Player body bottom on the previous frame. */
  playerPrevBottom: number;
  playerVelocityY: number;
  enemyTop: number;
  stompable: boolean;
}

/** True when something falling with this velocity came down onto `top` this frame. */
export function landedOn(prevBottom: number, velocityY: number, top: number): boolean {
  return velocityY > 0 && prevBottom <= top + STOMP_TOLERANCE;
}

export function resolveContact(c: Contact): ContactOutcome {
  return c.stompable && landedOn(c.playerPrevBottom, c.playerVelocityY, c.enemyTop) ? "stomp" : "hurt";
}
