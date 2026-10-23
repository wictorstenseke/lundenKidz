export const MAX_HEARTS = 5;
export const INVINCIBILITY_MS = 1200;

export type HitResult = "ignored" | "hurt" | "dead";

/** The Player's Hearts plus the Invincibility window after each hit. */
export class Health {
  hearts: number;
  private invincibleUntil = -Infinity;

  constructor(
    readonly max = MAX_HEARTS,
    private readonly invincibleMs = INVINCIBILITY_MS,
  ) {
    this.hearts = max;
  }

  isInvincible(now: number): boolean {
    return now < this.invincibleUntil;
  }

  hit(now: number): HitResult {
    if (this.hearts <= 0 || this.isInvincible(now)) return "ignored";
    this.hearts -= 1;
    if (this.hearts === 0) return "dead";
    this.invincibleUntil = now + this.invincibleMs;
    return "hurt";
  }

  /** Returns false when already at full Hearts, so the pickup can stay in the Level. */
  heal(amount = 1): boolean {
    if (this.hearts >= this.max) return false;
    this.hearts = Math.min(this.max, this.hearts + amount);
    return true;
  }

  reset(): void {
    this.hearts = this.max;
    this.invincibleUntil = -Infinity;
  }
}
