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
  const { firstColumn, columns } = theme.backdrop;
  const w = columns * TILE;
  BANDS.forEach((band, row) => {
    const key = bandKey(theme, band);
    if (scene.textures.exists(key)) return;
    const src = scene.textures.get("backdrops").getSourceImage() as HTMLImageElement;
    const canvas = scene.textures.createCanvas(key, w, BAND_H)!;
    canvas.getContext().drawImage(src, firstColumn * TILE, row * BAND_H, w, BAND_H, 0, 0, w, BAND_H);
    canvas.refresh();
  });
}

export function createParallax(scene: Phaser.Scene, theme: Theme, _worldW: number, worldH: number): ParallaxHandle {
  ensureTextures(scene, theme);
  const cam = scene.cameras.main;
  // worldView already accounts for zoom (384x216 at zoom 3). The camera moves during render, after
  // update(), so the strips are a frame behind it; the margin keeps their edges off screen meanwhile.
  const margin = 48;
  const viewW = Math.ceil(cam.width / cam.zoom) + margin * 2;

  const stripTop = worldH - STRIP_BOTTOM_OFFSET;
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
