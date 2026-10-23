import { describe, expect, it } from "vitest";
import { ACCENT_COLORS, defaultOutfit, PANTS_COLORS, randomOutfit, SHIRT_COLORS, SHOE_COLORS } from "./outfits";

describe("outfits", () => {
  it("default is plain and long in the given colours", () => {
    expect(defaultOutfit(1, 2)).toMatchObject({ shirt: 1, pants: 2, shirtStyle: "plain", pantsStyle: "long" });
  });

  it("random picks only from the palettes and never matches accent to shirt", () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 200; i++) {
      const o = randomOutfit(rng);
      expect(SHIRT_COLORS).toContain(o.shirt);
      expect(ACCENT_COLORS).toContain(o.accent);
      expect(PANTS_COLORS).toContain(o.pants);
      expect(SHOE_COLORS).toContain(o.shoes);
      expect(o.accent).not.toBe(o.shirt);
    }
  });

  it("rng at the edges stays in range", () => {
    expect(() => randomOutfit(() => 0)).not.toThrow();
    expect(() => randomOutfit(() => 0.999999)).not.toThrow();
  });
});
