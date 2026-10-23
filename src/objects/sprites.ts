import Phaser from "phaser";
import type { Outfit } from "../logic/outfits";

/**
 * The kids' pixel bodies: two 32x32 sprite sets (boy, girl) with idle/walk/run/jump rows plus a
 * biking row, recoloured to each Character's outfit. The sheets face right; left is `flipX`.
 * The pixel head is drawn but hidden under the kid's photo, which follows `headAnchor` per frame.
 */
export type SpriteKind = "boy" | "girl";

export const FRAME_SIZE = 32;
/** Where the feet (or wheels) touch the ground, in frame pixels. */
export const ORIGIN = { x: 16, y: 30 } as const;
const COLUMNS = 8;

/** Row order on the body sheets. */
export const BODY_ROWS = { idle: 0, walk: 1, run: 2, jump: 3 } as const;
export const rowFrames = (row: number): number[] => Array.from({ length: COLUMNS }, (_, i) => row * COLUMNS + i);
/** The jump row, one phase per frame; picked by physics rather than played through. */
export const JUMP = {
  anticipation: 24,
  takeoff: 25,
  riseTuck: 26,
  rise: 27,
  apex: 28,
  fall: 29,
  land: 30,
  recover: 31,
} as const;
export const FRAME_RATE = { idle: 8, walk: 10, run: 14, ride: 10 } as const;

/** Loader keys of the raw sheets. */
export const SHEET = { boy: "sheet-boy", girl: "sheet-girl", bikes: "sheet-bikes" } as const;
/** Rows of the bike sheet: boy right, girl right (left rows are mirrors; we flip instead). */
const BIKE_ROW: Record<SpriteKind, number> = { boy: 0, girl: 1 };

export const bodyTexture = (id: string): string => `body-${id}`;
export const bikeTexture = (id: string): string => `bike-${id}`;
export const ANIM = {
  idle: (id: string) => `idle-${id}`,
  walk: (id: string) => `walk-${id}`,
  run: (id: string) => `run-${id}`,
  ride: (id: string) => `ride-${id}`,
};

/** Colours on the base sheets that make up the clothes. The first of each family sets the base shade. */
interface Families {
  shirt: number[];
  /** The scarf; shoes share these reds/golds lower down the frame. */
  accent: number[];
  pants: number[];
}

const FAMILIES: Record<SpriteKind, Families> = {
  boy: {
    shirt: [0x134b62, 0x3c707a],
    accent: [0xe85a46, 0xd24640, 0xa0433c, 0x902c34],
    // Also the hair, which the row limits below keep out.
    pants: [0x23294e, 0x1c2a4c, 0x242f53, 0x1c2448, 0x11152f, 0x171e3e, 0x151831, 0x1c2142],
  },
  girl: {
    shirt: [0x703135, 0x682d33, 0x5d282f, 0x522429, 0x461e25],
    accent: [0xf6a137, 0xe68b3c, 0xd26f3f, 0xfab047],
    pants: [0x303042, 0x282737, 0x221e2a, 0x43424c, 0x151831, 0x11152f],
  },
};

/** Frame rows below which a family is left alone (hair shares colours with pants and the girl's jacket). */
interface RowLimits {
  shirtFrom: number;
  pantsFrom: number;
  /** Accent colours from this row down are shoes rather than scarf. */
  shoesFrom: number;
}
const BODY_LIMITS: RowLimits = { shirtFrom: 12, pantsFrom: 20, shoesFrom: 22 };
const BIKE_LIMITS: RowLimits = { shirtFrom: 10, pantsFrom: 13, shoesFrom: 26 };

const luminance = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const split = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

/** Paints `target` at the brightness of the pixel relative to the family's base colour. */
function recolour(px: Uint8ClampedArray, i: number, base: number, target: number): void {
  const ratio = Phaser.Math.Clamp(luminance(px[i], px[i + 1], px[i + 2]) / Math.max(1, luminance(...split(base))), 0.35, 1.6);
  const [r, g, b] = split(target);
  px[i] = Math.min(255, Math.round(r * ratio));
  px[i + 1] = Math.min(255, Math.round(g * ratio));
  px[i + 2] = Math.min(255, Math.round(b * ratio));
}

/** Copies `src` into a new canvas texture, dressing every frame in the outfit. */
function dressedCanvas(scene: Phaser.Scene, key: string, src: HTMLImageElement, sy: number, w: number, h: number, kind: SpriteKind, outfit: Outfit, limits: RowLimits): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = scene.textures.createCanvas(key, w, h)!;
  const ctx = canvas.getContext();
  ctx.drawImage(src, 0, sy, w, h, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  for (let f = 0; f < (w / FRAME_SIZE) * (h / FRAME_SIZE); f++) eraseHead(px, w, (f % COLUMNS) * FRAME_SIZE, Math.floor(f / COLUMNS) * FRAME_SIZE, kind);
  const fam = FAMILIES[kind];
  const lookup = new Map<number, keyof Families>();
  for (const name of ["shirt", "accent", "pants"] as const) for (const c of fam[name]) lookup.set(c, name);
  for (let y = 0; y < h; y++) {
    const row = y % FRAME_SIZE;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] === 0) continue;
      const family = lookup.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
      if (family === "shirt" && row >= limits.shirtFrom) recolour(px, i, fam.shirt[0], outfit.shirt);
      else if (family === "pants" && row >= limits.pantsFrom) recolour(px, i, fam.pants[0], outfit.pants);
      else if (family === "accent") recolour(px, i, fam.accent[0], row >= limits.shoesFrom ? outfit.shoes : outfit.accent);
    }
  }
  ctx.putImageData(image, 0, 0);
  for (let f = 0; f < (w / FRAME_SIZE) * (h / FRAME_SIZE); f++) {
    canvas.add(f, 0, (f % COLUMNS) * FRAME_SIZE, Math.floor(f / COLUMNS) * FRAME_SIZE, FRAME_SIZE, FRAME_SIZE);
  }
  canvas.refresh();
  return canvas;
}

/** Rows below the top of the hair that are still hair (the girl's ponytail hangs lower). */
const HAIR_DEPTH: Record<SpriteKind, number> = { boy: 9, girl: 14 };
/** Rows below the top of the hair that hold the face. */
const FACE_DEPTH = 8;

/**
 * Clears the pixel head from one frame, so nothing peeks out around the photo: every hair-coloured
 * pixel near the top of the head, and everything between the hair's left and right edges in the
 * face rows (eyes, skin, bangs).
 */
function eraseHead(px: Uint8ClampedArray, w: number, fx: number, fy: number, kind: SpriteKind): void {
  const hair = new Set(HAIR[kind]);
  const shade = new Set(HAIR_SHADE[kind]);
  const at = (x: number, y: number) => ((fy + y) * w + fx + x) * 4;
  const colour = (x: number, y: number) => (px[at(x, y)] << 16) | (px[at(x, y) + 1] << 8) | px[at(x, y) + 2];
  const isHair = (x: number, y: number) => px[at(x, y) + 3] > 0 && hair.has(colour(x, y));
  const isShade = (x: number, y: number) => px[at(x, y) + 3] > 0 && shade.has(colour(x, y));
  let top = -1;
  for (let y = 0; y < FRAME_SIZE && top < 0; y++) for (let x = 0; x < FRAME_SIZE; x++) if (isHair(x, y)) { top = y; break; }
  if (top < 0) return;
  let left = FRAME_SIZE;
  let right = -1;
  for (let y = top; y < Math.min(FRAME_SIZE, top + FACE_DEPTH); y++) {
    for (let x = 0; x < FRAME_SIZE; x++) if (isHair(x, y)) { left = Math.min(left, x); right = Math.max(right, x); }
  }
  for (let y = top; y < Math.min(FRAME_SIZE, top + HAIR_DEPTH[kind]); y++) {
    for (let x = 0; x < FRAME_SIZE; x++) {
      const inside = x >= left - 1 && x <= right + 1;
      const face = y < top + FACE_DEPTH && inside;
      // Shades count as hair inside the head's columns and behind it (where a ponytail trails).
      if (face || isHair(x, y) || ((inside || x < left) && isShade(x, y))) px[at(x, y) + 3] = 0;
    }
  }
}

const sheetImage = (scene: Phaser.Scene, key: string): HTMLImageElement => scene.textures.get(key).getSourceImage() as HTMLImageElement;

/** (Re)draws the Character's body sheet in the outfit and rebuilds its looping animations. */
export function makeBody(scene: Phaser.Scene, id: string, kind: SpriteKind, outfit: Outfit): void {
  const src = sheetImage(scene, SHEET[kind]);
  dressedCanvas(scene, bodyTexture(id), src, 0, src.width, src.height, kind, outfit, BODY_LIMITS);
  headAnchors(scene, SHEET[kind], kind);
  for (const [name, row] of Object.entries(BODY_ROWS) as [keyof typeof BODY_ROWS, number][]) {
    if (name === "jump") continue;
    const key = ANIM[name](id);
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(bodyTexture(id), { frames: rowFrames(row) }), frameRate: FRAME_RATE[name], repeat: -1 });
  }
}

/** The Character pedalling, cut from the bike sheet's row for their kind and dressed like the body. */
export function makeBike(scene: Phaser.Scene, id: string, kind: SpriteKind, outfit: Outfit): void {
  const src = sheetImage(scene, SHEET.bikes);
  const row = BIKE_ROW[kind];
  dressedCanvas(scene, bikeTexture(id), src, row * FRAME_SIZE, src.width, FRAME_SIZE, kind, outfit, BIKE_LIMITS);
  headAnchors(scene, SHEET.bikes, kind);
  const key = ANIM.ride(id);
  if (scene.anims.exists(key)) scene.anims.remove(key);
  scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(bikeTexture(id), { frames: rowFrames(0) }), frameRate: FRAME_RATE.ride, repeat: -1 });
}

// --- Head anchors ----------------------------------------------------------

/** Hair colours on the base sheets, which mark where the pixel head is (hands raised above it don't count). */
const HAIR: Record<SpriteKind, number[]> = {
  boy: [0x1c2448, 0x242f53, 0x1c2142, 0x171e3e, 0x23294e, 0x11152f, 0x151831],
  girl: [0x6e372d, 0x7c3c31, 0x69322d, 0x602e26, 0x612f2f],
};
/** Darker shades the hair shares with the clothes; erased only inside the head's own columns. */
const HAIR_SHADE: Record<SpriteKind, number[]> = {
  boy: [0x1c2a4c, 0x303042, 0x282737, 0x221e2a],
  girl: [0x552a27, 0x522429, 0x472323, 0x5d282f, 0x461e25, 0x3a1b1e, 0x25161f],
};
/** Centre of the photo head, this far below the top of the pixel hair. */
const HEAD_DROP = 5;
/** Rows of hair below its top that place the head sideways (deeper rows trail behind in a run). */
const HAIR_ROWS = 5;
const anchors = new Map<string, { x: number; y: number }[]>();
const anchorKey = (sheetKey: string, kind: SpriteKind): string => `${sheetKey}/${kind}`;

/**
 * Where the photo head sits on each frame, in frame pixels: measured once per sheet from the hair
 * pixels, so the head rides along with crouches, strides and leans.
 */
function headAnchors(scene: Phaser.Scene, sheetKey: string, kind: SpriteKind): void {
  const key = anchorKey(sheetKey, kind);
  if (anchors.has(key)) return;
  const src = sheetImage(scene, sheetKey);
  const probe = document.createElement("canvas");
  probe.width = src.width;
  probe.height = src.height;
  const ctx = probe.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const px = ctx.getImageData(0, 0, src.width, src.height).data;
  const hair = new Set(HAIR[kind]);
  const hairAt = (x: number, y: number) => {
    const i = (y * src.width + x) * 4;
    return px[i + 3] > 0 && hair.has((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  };
  const list: { x: number; y: number }[] = [];
  for (let f = 0; f < (src.width / FRAME_SIZE) * (src.height / FRAME_SIZE); f++) {
    const fx = (f % COLUMNS) * FRAME_SIZE;
    const fy = Math.floor(f / COLUMNS) * FRAME_SIZE;
    let top = -1;
    for (let y = 0; y < FRAME_SIZE && top < 0; y++) for (let x = 0; x < FRAME_SIZE; x++) if (hairAt(fx + x, fy + y)) { top = y; break; }
    if (top < 0) {
      list.push({ x: ORIGIN.x, y: 4 + HEAD_DROP });
      continue;
    }
    let sum = 0;
    let n = 0;
    for (let y = top; y < Math.min(FRAME_SIZE, top + HAIR_ROWS); y++) for (let x = 0; x < FRAME_SIZE; x++) if (hairAt(fx + x, fy + y)) { sum += x; n++; }
    list.push({ x: Math.round(sum / n + 0.5), y: top + HEAD_DROP });
  }
  anchors.set(key, list);
}

/** Centre of the photo head, in frame pixels, for a frame of the given kind's body (or bike) sheet. */
export function headAnchor(kind: SpriteKind, frame: number, vehicle: "feet" | "bike" = "feet"): { x: number; y: number } {
  const list = anchors.get(anchorKey(vehicle === "bike" ? SHEET.bikes : SHEET[kind], kind));
  const index = vehicle === "bike" ? BIKE_ROW[kind] * COLUMNS + frame : frame;
  return list?.[index] ?? { x: ORIGIN.x, y: 8 };
}
