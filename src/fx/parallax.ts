import Phaser from "phaser";
import type { Theme } from "../levels/themes";

const TILE = 24;
const BAND_H = 24;
/** Today's strip: top = worldH - 100, height 72 (3 bands). */
const STRIP_BOTTOM_OFFSET = 100;
const BANDS = ["sky", "far", "near"] as const;
type Band = (typeof BANDS)[number];

/** Horizontal scroll factor per band (0 = fixed at infinity, 1 = moves with the world). */
const FACTORS: Record<Band, number> = { sky: 0.1, far: 0.25, near: 0.45 };
/** Sky < far < near; background clouds should sit between sky and far (-12.5), floor-ish rect shares near's depth. */
const DEPTHS: Record<Band, number> = { sky: -13, far: -12, near: -11 };
const FLOOR_H = 600;

export interface ParallaxHandle {
  update(): void;
  destroy(): void;
  layers: Phaser.GameObjects.TileSprite[];
}

/** Texture offset for a band: the sprite is glued to the camera, so the texture must drift by scrollX * factor. */
export function bandOffset(scrollX: number, factor: number): number {
  return scrollX * factor;
}

function bandKey(theme: Theme, band: Band): string {
  return `parallax-${theme.id}-${band}`;
}

function ensureTextures(scene: Phaser.Scene, theme: Theme): void {
  const { firstColumn, columns, paint } = theme.backdrop;
  const w = columns * TILE;
  BANDS.forEach((band, row) => {
    const key = bandKey(theme, band);
    if (scene.textures.exists(key)) return;
    const canvas = scene.textures.createCanvas(key, w, BAND_H)!;
    const ctx = canvas.getContext();
    if (paint) {
      PAINTERS[paint](ctx, band, w, theme);
    } else {
      const src = scene.textures.get("backdrops").getSourceImage() as HTMLImageElement;
      ctx.drawImage(src, firstColumn * TILE, row * BAND_H, w, BAND_H, 0, 0, w, BAND_H);
    }
    canvas.refresh();
  });
}

type Painter = (ctx: CanvasRenderingContext2D, band: Band, w: number, theme: Theme) => void;

const hex = (c: number): string => `#${c.toString(16).padStart(6, "0")}`;

/** Blends `a` towards `b` by t (0..1), as CSS hex. (Plain maths: this module is unit tested without Phaser.) */
function mix(a: number, b: number, t: number): string {
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
  return hex((ch(16) << 16) | (ch(8) << 8) | ch(0));
}

/** Small seeded generator (mulberry32) so painted bands come out the same every run. */
class Rnd {
  private s: number;
  constructor(seed: string) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    this.s = h >>> 0;
  }
  frac(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  between(min: number, max: number): number {
    return min + Math.floor(this.frac() * (max - min + 1));
  }
  pick<T>(items: T[]): T {
    return items[Math.floor(this.frac() * items.length)];
  }
}

/** A few specks of starlight in the sky band. */
function speckle(ctx: CanvasRenderingContext2D, rnd: Rnd, w: number, count: number): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rnd.pick(["#ffffff", "#dfe6ff", "#9aa4c8"]);
    ctx.fillRect(rnd.between(0, w - 1), rnd.between(0, BAND_H - 6), 1, 1);
  }
}

/** Night city: distant towers in the far band, nearer blocks with lit windows in the near band. */
const paintSkyline: Painter = (ctx, band, w, theme) => {
  const rnd = new Rnd(`${theme.id}-${band}`);
  ctx.fillStyle = hex(theme.sky);
  ctx.fillRect(0, 0, w, BAND_H);
  if (band === "sky") {
    speckle(ctx, rnd, w, Math.round(w / 8));
    return;
  }
  const far = band === "far";
  const body = mix(theme.sky, 0x000000, far ? 0.35 : 0.7);
  let x = 0;
  while (x < w) {
    const bw = rnd.between(far ? 5 : 8, far ? 10 : 16);
    const bh = rnd.between(far ? 6 : 8, far ? 18 : 22);
    const width = Math.min(bw, w - x);
    ctx.fillStyle = body;
    ctx.fillRect(x, BAND_H - bh, width, bh);
    if (!far) {
      // Lit windows in a loose grid, a few dark.
      for (let wy = BAND_H - bh + 2; wy < BAND_H - 2; wy += 3) {
        for (let wx = x + 1; wx < x + width - 1; wx += 3) {
          if (rnd.frac() < 0.6) {
            ctx.fillStyle = rnd.pick(["#ffe9a0", "#ffd56a", "#c9e2ff"]);
            ctx.fillRect(wx, wy, 1, 1);
          }
        }
      }
      // Rooftop antenna now and then.
      if (rnd.frac() < 0.3) ctx.fillRect(x + Math.floor(width / 2), BAND_H - bh - 3, 1, 3);
    }
    x += width + (far ? 0 : rnd.between(0, 2));
  }
  if (!far) {
    // Street glow along the bottom edge.
    ctx.fillStyle = mix(theme.sky, 0xffb060, 0.25);
    ctx.fillRect(0, BAND_H - 1, w, 1);
  }
};

/** Space station: stars, then a distant hull with portholes and a near deck of riveted panels. */
const paintStation: Painter = (ctx, band, w, theme) => {
  const rnd = new Rnd(`${theme.id}-${band}`);
  ctx.fillStyle = hex(theme.sky);
  ctx.fillRect(0, 0, w, BAND_H);
  if (band === "sky") {
    speckle(ctx, rnd, w, Math.round(w / 5));
    // A small distant planet.
    ctx.fillStyle = "#3f5a8a";
    ctx.beginPath();
    ctx.arc(w * 0.7, 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a86b8";
    ctx.fillRect(w * 0.7 - 3, 6, 3, 1);
    return;
  }
  const far = band === "far";
  speckle(ctx, rnd, w, far ? Math.round(w / 12) : 0);
  const top = far ? 12 : 4;
  ctx.fillStyle = far ? "#1c2238" : "#2a3350";
  ctx.fillRect(0, top, w, BAND_H - top);
  ctx.fillStyle = far ? "#2a3350" : "#3c4868";
  ctx.fillRect(0, top, w, 1);
  if (far) {
    for (let x = 6; x < w; x += 14) {
      ctx.fillStyle = rnd.frac() < 0.75 ? "#9fd0ff" : "#1c2238";
      ctx.fillRect(x, top + 5, 2, 2);
    }
    return;
  }
  // Panel seams and rivets, with the occasional lit porthole.
  for (let x = 0; x < w; x += 12) {
    ctx.fillStyle = "#1c2238";
    ctx.fillRect(x, top, 1, BAND_H - top);
    ctx.fillStyle = "#4e5c80";
    ctx.fillRect(x + 2, top + 2, 1, 1);
    ctx.fillRect(x + 9, top + 2, 1, 1);
    if (rnd.frac() < 0.4) {
      ctx.fillStyle = "#3c4868";
      ctx.fillRect(x + 4, top + 7, 4, 4);
      ctx.fillStyle = "#9fd0ff";
      ctx.fillRect(x + 5, top + 8, 2, 2);
    }
  }
  ctx.fillStyle = "#1c2238";
  ctx.fillRect(0, BAND_H - 3, w, 1);
};

const PAINTERS: Record<NonNullable<Theme["backdrop"]["paint"]>, Painter> = { skyline: paintSkyline, station: paintStation };

export function createParallax(scene: Phaser.Scene, theme: Theme, _worldW: number, worldH: number): ParallaxHandle {
  ensureTextures(scene, theme);
  const cam = scene.cameras.main;
  // worldView already accounts for zoom (384x216 at zoom 3). The camera moves during render, after
  // update(), so the strips are a frame behind it; the margin keeps their edges off screen meanwhile.
  const margin = 48;
  const viewW = Math.ceil(cam.width / cam.zoom) + margin * 2;

  const stripTop = worldH - STRIP_BOTTOM_OFFSET - (theme.backdrop.lift ?? 0);
  const nearTop = stripTop + 2 * BAND_H;
  const farTop = stripTop + BAND_H;
  // One sky row, like the old strip: above it the camera background shows, so tall Levels keep their sky fade.
  const skyRows = 1;
  const skyTop = farTop - skyRows * BAND_H;

  const make = (band: Band, y: number, h: number): Phaser.GameObjects.TileSprite =>
    scene.add
      .tileSprite(0, y, viewW, h, bandKey(theme, band))
      .setOrigin(0)
      .setScrollFactor(1, 1)
      .setDepth(DEPTHS[band])
      .setTint(theme.backdrop.tint);

  const sky = make("sky", skyTop, skyRows * BAND_H);
  const far = make("far", farTop, BAND_H);
  const near = make("near", nearTop, BAND_H);
  const floor = scene.add
    .rectangle(0, nearTop + BAND_H, viewW, FLOOR_H, theme.backdrop.floor)
    .setOrigin(0)
    .setScrollFactor(1, 1)
    .setDepth(DEPTHS.near);

  const entries: [Phaser.GameObjects.TileSprite, number][] = [
    [sky, FACTORS.sky],
    [far, FACTORS.far],
    [near, FACTORS.near],
  ];

  const update = (): void => {
    const x = Math.floor(cam.worldView.x) - margin;
    for (const [layer, f] of entries) {
      layer.x = x;
      layer.tilePositionX = Math.floor(bandOffset(cam.worldView.x, f));
    }
    floor.x = x;
  };
  update();

  return {
    layers: [sky, far, near],
    update,
    destroy() {
      for (const [layer] of entries) layer.destroy();
      floor.destroy();
    },
  };
}
