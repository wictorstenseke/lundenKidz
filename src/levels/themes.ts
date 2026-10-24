export type ThemeId =
  | "grass" | "cave" | "snow" | "sky" | "castle"
  | "alpine" | "storm" | "desert" | "tomb"
  | "jungle" | "haunted" | "volcano" | "rooftops" | "space";

/** Procedurally painted parallax bands, for places the Kenney background sheet has no strip for. */
export type BackdropPaint = "skyline" | "station";

/** Frames in the Kenney tile sheet (18px, 20 columns). Edge rows are [single, left, middle, right]. */
export interface Theme {
  id: ThemeId;
  sky: number;
  /** Sky colour at the very top of a tall Level; the sky fades towards it as the Player climbs. */
  skyTop?: number;
  /**
   * Column range in the background sheet (24px tiles) used for the parallax strip. With `paint` set the
   * bands are drawn in code instead (`columns` still sets the repeat width). `lift` raises the strip by
   * that many px so it shows above raised ground (rooftops).
   */
  backdrop: { firstColumn: number; columns: number; floor: number; tint: number; paint?: BackdropPaint; lift?: number };
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
  /** Light2D ambient colour for lit objects: bright outdoors, dim underground. */
  ambient: number;
  /** Vignette strength override (see FX_TUNING.vignetteStrength); near zero keeps daylight edges bright. */
  vignette?: number;
  /** Rain streaks fall over the view. */
  rain?: boolean;
  /** Pale fog banks drift across the ground. */
  fog?: boolean;
  /** Glowing embers rise from below. */
  embers?: boolean;
  /** Twinkling stars across the sky. */
  stars?: boolean;
  /** Gravity multiplier: below 1 is floaty (space). */
  gravity?: number;
  music: MusicId;
}

/** One song per theme; the grass theme's is called "meadow". */
export type MusicId = Exclude<ThemeId, "grass"> | "meadow";

const DIRT: Theme["groundFill"] = [120, 121, 122, 123];

/**
 * Daylight presets. Lit objects are multiplied by the ambient colour, so daytime Levels sit near
 * white and lights only add a halo; the vignette (which darkens the ground band at the bottom of the
 * screen by ~16% at the default strength) is nearly off. Dark Levels keep their own low ambient and
 * the default vignette so lanterns matter.
 */
const SUNNY = { ambient: 0xf6f6fa, vignette: 0.06 } as const;
const OVERCAST = { ambient: 0xdce2dc, vignette: 0.12 } as const;

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
    ...SUNNY,
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
    ambient: 0x4a4458,
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
    ...SUNNY,
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
    ...SUNNY,
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
    ambient: 0x403a58,
    music: "castle",
  },
  // World B: alpine mountains. Grey rock, pine trees, snowy peaks behind.
  alpine: {
    id: "alpine",
    sky: 0x9fd8f4,
    skyTop: 0x3b5aa8,
    backdrop: { firstColumn: 0, columns: 4, floor: 0xa9c6cc, tint: 0xdce8f0 },
    groundTop: [60, 61, 62, 63],
    groundFill: DIRT,
    block: 6,
    decor: [126, 125, 126, 124],
    traction: 1,
    clouds: true,
    tint: 0xd8dde8,
    ...SUNNY,
    music: "alpine",
  },
  // A rain-soaked mountain pass: the alpine look under a dark sky.
  storm: {
    id: "storm",
    sky: 0x4c5a74,
    skyTop: 0x2a3148,
    backdrop: { firstColumn: 0, columns: 4, floor: 0x55667a, tint: 0x7a8aa0 },
    groundTop: [60, 61, 62, 63],
    groundFill: DIRT,
    block: 6,
    decor: [126, 126, 125, 126],
    traction: 1,
    clouds: false,
    tint: 0x9aa4bc,
    ...OVERCAST,
    rain: true,
    music: "storm",
  },
  // World C: desert. Sand tops, cacti, orange dunes behind.
  desert: {
    id: "desert",
    sky: 0xffd98a,
    backdrop: { firstColumn: 4, columns: 2, floor: 0xb86f44, tint: 0xffffff },
    groundTop: [40, 41, 42, 43],
    groundFill: DIRT,
    block: 26,
    decor: [127, 125, 127, 124],
    traction: 1,
    clouds: true,
    tint: 0xffffff,
    ...SUNNY,
    music: "desert",
  },
  // Inside a pyramid: sand under a stone ceiling, lit by lanterns.
  tomb: {
    id: "tomb",
    sky: 0x5a3f2a,
    backdrop: { firstColumn: 4, columns: 2, floor: 0x3a2618, tint: 0x6a5040 },
    groundTop: [40, 41, 42, 43],
    groundFill: DIRT,
    block: 6,
    decor: [128, 124, 128, 129],
    traction: 1,
    clouds: false,
    tint: 0xcdb8a0,
    ambient: 0x4a4038,
    music: "tomb",
  },
  // World D: far and wild. Deep green rainforest under steady rain, vines hanging from the ledges.
  jungle: {
    id: "jungle",
    sky: 0x4f9a62,
    skyTop: 0x2f6a44,
    backdrop: { firstColumn: 6, columns: 2, floor: 0x1f6a4a, tint: 0x88c890 },
    groundTop: [20, 21, 22, 23],
    groundFill: DIRT,
    block: 26,
    decor: [125, 124, 125, 126],
    traction: 1,
    clouds: false,
    tint: 0xbfe0b0,
    ...OVERCAST,
    rain: true,
    music: "jungle",
  },
  // Haunted forest: pale dead trees behind a dusky sky, fog on the ground.
  haunted: {
    id: "haunted",
    sky: 0x2e2a40,
    skyTop: 0x1a1726,
    backdrop: { firstColumn: 0, columns: 4, floor: 0x2a2838, tint: 0x5a5478 },
    groundTop: [20, 21, 22, 23],
    groundFill: DIRT,
    block: 6,
    decor: [126, 129, 126, 128],
    traction: 1,
    clouds: false,
    tint: 0x8c88a8,
    ambient: 0x4c4664,
    fog: true,
    music: "haunted",
  },
  // Volcano: red rock, lava in every pit, embers in the air.
  volcano: {
    id: "volcano",
    sky: 0x4a1c16,
    skyTop: 0x2a0c0a,
    backdrop: { firstColumn: 4, columns: 2, floor: 0xff6a1a, tint: 0xb04030 },
    groundTop: [60, 61, 62, 63],
    groundFill: DIRT,
    block: 6,
    decor: [128, 124, 128, 128],
    traction: 1,
    clouds: false,
    tint: 0xd8907c,
    ambient: 0x7a4040,
    embers: true,
    music: "volcano",
  },
  // Night rooftops: a painted city skyline, stars, concrete roofs lit by street lamps.
  rooftops: {
    id: "rooftops",
    sky: 0x1c2140,
    skyTop: 0x0c0e22,
    backdrop: { firstColumn: 0, columns: 6, floor: 0x10122a, tint: 0xffffff, paint: "skyline", lift: 100 },
    groundTop: [60, 61, 62, 63],
    groundFill: DIRT,
    block: 6,
    decor: [124, 125, 124, 124],
    traction: 1,
    clouds: false,
    tint: 0x9aa0c0,
    ambient: 0x4a4e70,
    stars: true,
    music: "rooftops",
  },
  // Space station: low gravity, metal decks, portholes, stars all around.
  space: {
    id: "space",
    sky: 0x05060f,
    backdrop: { firstColumn: 0, columns: 6, floor: 0x0a0c18, tint: 0xffffff, paint: "station" },
    groundTop: [60, 61, 62, 63],
    groundFill: DIRT,
    block: 6,
    decor: [124, 124, 125, 124],
    traction: 1,
    clouds: false,
    tint: 0x9fb4c8,
    ambient: 0x5a6a8a,
    stars: true,
    gravity: 0.55,
    music: "space",
  },
};
