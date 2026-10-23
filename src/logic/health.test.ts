import { describe, expect, it } from "vitest";
import { Health, MAX_HEARTS } from "./health";

describe("Health", () => {
  it("starts with five Hearts", () => {
    expect(new Health().hearts).toBe(MAX_HEARTS);
    expect(MAX_HEARTS).toBe(5);
  });

  it("loses one Heart per hit and becomes invincible", () => {
    const h = new Health(5, 1000);
    expect(h.hit(0)).toBe("hurt");
    expect(h.hearts).toBe(4);
    expect(h.isInvincible(500)).toBe(true);
    expect(h.hit(500)).toBe("ignored");
    expect(h.hearts).toBe(4);
    expect(h.isInvincible(1000)).toBe(false);
    expect(h.hit(1000)).toBe("hurt");
    expect(h.hearts).toBe(3);
  });

  it("reports dead when the last Heart is lost", () => {
    const h = new Health(2, 0);
    h.hit(0);
    expect(h.hit(1)).toBe("dead");
    expect(h.hearts).toBe(0);
    expect(h.hit(2)).toBe("ignored");
  });

  it("heals up to the max and refuses when full", () => {
    const h = new Health(5, 0);
    expect(h.heal()).toBe(false);
    h.hit(0);
    h.hit(1);
    expect(h.heal()).toBe(true);
    expect(h.hearts).toBe(4);
  });

  it("reset restores all Hearts and clears Invincibility", () => {
    const h = new Health(5, 1000);
    h.hit(0);
    h.reset();
    expect(h.hearts).toBe(5);
    expect(h.isInvincible(1)).toBe(false);
  });
});
