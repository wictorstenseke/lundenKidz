/** What a Character wears: colours plus a shirt pattern and trouser length. */
export interface Outfit {
  shirt: number;
  shirtStyle: "plain" | "stripes" | "spots";
  /** Second colour for stripes/spots. */
  accent: number;
  pants: number;
  pantsStyle: "long" | "shorts";
  shoes: number;
}

export const SHIRT_COLORS = [0xe84a5f, 0x3fa34d, 0xf2a541, 0x4aa3e8, 0xf25fd0, 0xffe066, 0x9b59b6, 0x2ecc71, 0xffffff, 0xff7f50, 0x00bcd4, 0x1d1b2a];
export const ACCENT_COLORS = [0xffffff, 0x1d1b2a, 0xffe066, 0xe84a5f, 0x4aa3e8];
export const PANTS_COLORS = [0x2a4d8f, 0x5a3d2b, 0x6b3fa0, 0x333333, 0xc0392b, 0x2d7a4f, 0x8a8a8a, 0xf2a541];
export const SHOE_COLORS = [0x2b2233, 0xffffff, 0xc0392b, 0x3b5bdb];

export const SHIRT_STYLES: Outfit["shirtStyle"][] = ["plain", "stripes", "spots"];
export const PANTS_STYLES: Outfit["pantsStyle"][] = ["long", "shorts"];

/** Plain long-trousered outfit in the given colours. */
export function defaultOutfit(shirt: number, pants: number): Outfit {
  return { shirt, shirtStyle: "plain", accent: 0xffffff, pants, pantsStyle: "long", shoes: 0x2b2233 };
}

/** A fresh random outfit; `rng` returns [0, 1). Accent always differs from the shirt colour. */
export function randomOutfit(rng: () => number = Math.random): Outfit {
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];
  const shirt = pick(SHIRT_COLORS);
  const accent = pick(ACCENT_COLORS.filter((c) => c !== shirt));
  return { shirt, shirtStyle: pick(SHIRT_STYLES), accent, pants: pick(PANTS_COLORS), pantsStyle: pick(PANTS_STYLES), shoes: pick(SHOE_COLORS) };
}
