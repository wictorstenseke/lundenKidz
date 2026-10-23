export type ThemeId = "grass" | "cave" | "snow" | "sky" | "castle";

/** Frames in the Kenney tile sheet (18px, 20 columns). Edge rows are [single, left, middle, right]. */
export interface Theme {
  id: ThemeId;
  sky: number;
  /** Sky colour at the very top of a tall Level; the sky fades towards it as the Player climbs. */
  skyTop?: number;
  /** Column range in the background sheet (24px tiles) used for the parallax strip. */
  backdrop: { firstColumn: number; columns: number; floor: number; tint: number };
  groundTop: [number, number, number, number];
  groundFill: [number, number, number, number];
  block: number;
  /** Plant decorations, picked by column. */
  decor: number[];
  /** How grippy the ground is: 1 is normal, lower slides (ice). */
  traction: number;
  /** Faint clouds drifting in the background. */
  clouds: boolean;
  /** Multiplied into every terrain tile. */
  tint: number;
  music: MusicId;
}

export type MusicId = "meadow" | "cave" | "snow" | "sky" | "castle";

const DIRT: Theme["groundFill"] = [120, 121, 122, 123];

export const THEMES: Record<ThemeId, Theme> = {
  grass: {
    id: "grass",
    sky: 0x7ff0a5,
    backdrop: { firstColumn: 6, columns: 2, floor: 0x2eb082, tint: 0xffffff },
    groundTop: [20, 21, 22, 23],
    groundFill: DIRT,
    block: 26,
    decor: [125, 126, 124, 126],
    traction: 1,
    clouds: true,
    tint: 0xffffff,
    music: "meadow",
  },
  cave: {
    id: "cave",
    sky: 0x7d4b2e,
    backdrop: { firstColumn: 4, columns: 2, floor: 0x3e2a2c, tint: 0x806060 },
    groundTop: [60, 61, 62, 63],
    groundFill: DIRT,
    block: 6,
    decor: [128, 124, 128, 128],
    traction: 1,
    clouds: false,
    tint: 0xd9c4b8,
    music: "cave",
  },
  snow: {
    id: "snow",
    sky: 0xdff6f5,
    backdrop: { firstColumn: 0, columns: 4, floor: 0xc2e3e8, tint: 0xffffff },
    groundTop: [100, 101, 102, 103],
    groundFill: DIRT,
    block: 26,
    decor: [145, 126, 144, 126],
    traction: 0.25,
    clouds: true,
    tint: 0xffffff,
    music: "snow",
  },
  sky: {
    id: "sky",
    sky: 0xa8e4ff,
    skyTop: 0x2c3a8c,
    backdrop: { firstColumn: 0, columns: 4, floor: 0xc2e3e8, tint: 0xffffff },
    groundTop: [20, 21, 22, 23],
    groundFill: DIRT,
    block: 26,
    decor: [125, 126, 124, 126],
    traction: 1,
    clouds: true,
    tint: 0xffffff,
    music: "sky",
  },
  castle: {
    id: "castle",
    sky: 0x4e3f4d,
    backdrop: { firstColumn: 4, columns: 2, floor: 0x2c2442, tint: 0x5050a0 },
    groundTop: [60, 61, 62, 63],
    groundFill: DIRT,
    block: 6,
    decor: [129, 129, 128, 129],
    traction: 1,
    clouds: false,
    tint: 0xb8b0d8,
    music: "castle",
  },
};
