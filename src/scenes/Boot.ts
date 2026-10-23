import Phaser from "phaser";
import { CHARACTERS, getOutfit, type CharacterDef } from "../characters";
import type { Outfit } from "../logic/outfits";
import { FONT, SCENES } from "../config";
import { LEVELS } from "../levels/levels";
import { THEMES } from "../levels/themes";
import { makeDiamondTextures } from "../objects/Diamond";

/** Cache key of a Level's Tiled JSON, when it has one. */
export const levelJsonKey = (levelIndex: number): string => `level-${levelIndex}`;

export const HEAD_SIZE = 96;
export const BODY_W = 16;
export const BODY_H = 32;

export class Boot extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 16, 0xffffff).setOrigin(0, 0.5);
    this.load.on("progress", (p: number) => (bar.width = 400 * p));

    this.load.spritesheet("tiles", "assets/kenney/tiles.png", { frameWidth: 18, frameHeight: 18 });
    this.load.spritesheet("chars", "assets/kenney/characters.png", { frameWidth: 24, frameHeight: 24 });
    this.load.image("backdrops", "assets/kenney/backgrounds.png");
    for (const c of CHARACTERS) this.load.image(`photo-${c.id}`, c.photo);
    // Tiled Levels; a Level whose file fails to load falls back to its ASCII rows in Game.
    for (const [i, def] of LEVELS.entries()) if (def.tiled) this.load.json(levelJsonKey(i), def.tiled);
  }

  async create(): Promise<void> {
    await loadFont();
    for (const c of CHARACTERS) {
      makeHead(this, c);
      makeBody(this, c.id, getOutfit(c.id));
      makeBike(this, c);
    }
    makeBackdrops(this);
    makeCloud(this);
    makeExtrudedTiles(this);
    makeDiamondTextures(this);
    this.scene.start(SCENES.title);
  }
}

async function loadFont(): Promise<void> {
  try {
    const face = new FontFace(FONT, "url(fonts/PressStart2P-Regular.ttf)");
    document.fonts.add(await face.load());
  } catch {
    // Falls back to the browser's monospace font.
  }
}

/**
 * Cut-out head drawn as a glossy sticker: dark outline, soft drop shadow, and a light-from-top-left
 * shading pass so it reads as a rounded 3D object. Kept smooth (not pixelated).
 */
function makeHead(scene: Phaser.Scene, c: CharacterDef): void {
  const key = `head-${c.id}`;
  const canvas = scene.textures.createCanvas(key, HEAD_SIZE, HEAD_SIZE)!;
  const ctx = canvas.getContext();
  const photoKey = `photo-${c.id}`;
  if (!scene.textures.exists(photoKey)) {
    drawFallbackHead(ctx);
  } else {
    const img = scene.textures.get(photoKey).getSourceImage() as HTMLImageElement;
    drawStickerHead(ctx, img);
  }
  canvas.refresh();
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

const OUTLINE = 3;
const SHADOW = { dx: 2, dy: 4, blur: 3 };

function drawStickerHead(ctx: CanvasRenderingContext2D, img: HTMLImageElement): void {
  // Fit the cut-out inside the canvas, leaving room for the outline and shadow.
  const pad = OUTLINE + SHADOW.blur + 1;
  const box = HEAD_SIZE - pad * 2;
  const s = Math.min(box / img.width, box / img.height);
  const w = Math.round(img.width * s);
  const h = Math.round(img.height * s);
  const x = Math.round((HEAD_SIZE - w) / 2 - SHADOW.dx / 2);
  const y = Math.round((HEAD_SIZE - h) / 2 - SHADOW.dy / 2);

  // Silhouette of the cut-out, used for the outline and the shadow.
  const sil = document.createElement("canvas");
  sil.width = sil.height = HEAD_SIZE;
  const sctx = sil.getContext("2d")!;
  sctx.drawImage(img, x, y, w, h);
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = "#1d1b2a";
  sctx.fillRect(0, 0, HEAD_SIZE, HEAD_SIZE);

  // Drop shadow: offset down-right and blurred.
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.filter = `blur(${SHADOW.blur}px)`;
  ctx.drawImage(sil, SHADOW.dx, SHADOW.dy);
  ctx.restore();

  // Outline: stamp the silhouette around a ring.
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.drawImage(sil, Math.cos(a) * OUTLINE, Math.sin(a) * OUTLINE);
  }

  // The head itself.
  ctx.drawImage(img, x, y, w, h);

  // Shading confined to the head's pixels: light top-left, shade bottom-right, a rim of darkness at the edge.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(w, h) / 2;
  const light = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.1, cx, cy, r * 1.15);
  light.addColorStop(0, "rgba(255,255,255,0.28)");
  light.addColorStop(0.45, "rgba(255,255,255,0)");
  light.addColorStop(0.8, "rgba(20,10,40,0)");
  light.addColorStop(1, "rgba(20,10,40,0.45)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, HEAD_SIZE, HEAD_SIZE);
  const bottom = ctx.createLinearGradient(0, y, 0, y + h);
  bottom.addColorStop(0.55, "rgba(20,10,40,0)");
  bottom.addColorStop(1, "rgba(20,10,40,0.3)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, HEAD_SIZE, HEAD_SIZE);
  // Small glossy specular.
  const spec = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.55, 0, cx - r * 0.5, cy - r * 0.55, r * 0.35);
  spec.addColorStop(0, "rgba(255,255,255,0.35)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.fillRect(0, 0, HEAD_SIZE, HEAD_SIZE);
  ctx.restore();
}

/** Plain outlined circle when a photo is missing. */
function drawFallbackHead(ctx: CanvasRenderingContext2D): void {
  const r = HEAD_SIZE / 2;
  ctx.fillStyle = "#f5c9a0";
  ctx.beginPath();
  ctx.arc(r, r, r - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#1d1b2a";
  ctx.stroke();
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/**
 * Four-frame pixel body (stand, walk A, walk B, jump) wearing the outfit. Replaces any earlier body for
 * this Character, along with its walk animation, so the next Player picks up the new clothes.
 */
export function makeBody(scene: Phaser.Scene, id: string, outfit: Outfit): void {
  const key = `body-${id}`;
  if (scene.anims.exists(`walk-${id}`)) scene.anims.remove(`walk-${id}`);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const frames = 4;
  const canvas = scene.textures.createCanvas(key, BODY_W * frames, BODY_H)!;
  const ctx = canvas.getContext();
  const skin = "#f2c29b";
  const shirt = hex(outfit.shirt);
  const accent = hex(outfit.accent);
  const pants = hex(outfit.pants);
  const shoe = hex(outfit.shoes);
  const outline = "#1d1b2a";
  const shorts = outfit.pantsStyle === "shorts";

  for (let f = 0; f < frames; f++) {
    const ox = f * BODY_W;
    const px = (color: string, x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, y, w, h);
    };
    const jumping = f === 3;
    // Torso with outline
    px(outline, 3, 14, 10, 11);
    px(shirt, 4, 15, 8, 9);
    if (outfit.shirtStyle === "stripes") {
      for (const y of [16, 18, 20, 22]) px(accent, 4, y, 8, 1);
    } else if (outfit.shirtStyle === "spots") {
      for (const [x, y] of [[5, 16], [9, 16], [7, 18], [11, 19], [5, 20], [9, 21], [7, 23]]) px(accent, x, y, 1, 1);
    }
    // Arms
    if (jumping) {
      px(outline, 1, 8, 3, 9);
      px(outline, 12, 8, 3, 9);
      px(shirt, 2, 13, 1, 3);
      px(shirt, 13, 13, 1, 3);
      px(skin, 2, 9, 1, 4);
      px(skin, 13, 9, 1, 4);
    } else {
      const swing = f === 1 ? 1 : f === 2 ? -1 : 0;
      px(outline, 1, 15 + swing, 3, 9);
      px(outline, 12, 15 - swing, 3, 9);
      px(shirt, 2, 16 + swing, 1, 3);
      px(shirt, 13, 16 - swing, 1, 3);
      px(skin, 2, 19 + swing, 1, 4);
      px(skin, 13, 19 - swing, 1, 4);
    }
    // Pants and legs
    px(outline, 3, 24, 10, 4);
    px(pants, 4, 24, 8, 3);
    const legs: [number, number][] =
      f === 1 ? [[2, 0], [10, 0]] : f === 2 ? [[5, 0], [8, 0]] : jumping ? [[4, -2], [9, 0]] : [[4, 0], [8, 0]];
    for (const [lx, ly] of legs) {
      px(outline, lx - 1, 27 + ly, 5, 5);
      px(shorts ? skin : pants, lx, 27 + ly, 3, 2);
      px(shoe, lx - 1, 29 + ly, 5, 3);
    }
    canvas.add(f, 0, ox, 0, BODY_W, BODY_H);
  }
  canvas.refresh();
}

/** One parallax strip per theme, cut from the Kenney background sheet. */
function makeBackdrops(scene: Phaser.Scene): void {
  const src = scene.textures.get("backdrops").getSourceImage() as HTMLImageElement;
  for (const theme of Object.values(THEMES)) {
    const { firstColumn, columns } = theme.backdrop;
    const w = columns * 24;
    const canvas = scene.textures.createCanvas(`backdrop-${theme.id}`, w, 72)!;
    canvas.getContext().drawImage(src, firstColumn * 24, 0, w, 72, 0, 0, w, 72);
    canvas.refresh();
  }
}

/** A soft, outline-free puff so background clouds never look like platforms. */
function makeCloud(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas("bg-cloud", 48, 20)!;
  const ctx = canvas.getContext();
  ctx.fillStyle = "#ffffff";
  for (const [x, y, r] of [[12, 13, 7], [23, 9, 9], [35, 12, 8]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(12, 13, 24, 7);
  canvas.refresh();
}

export const TILE_MARGIN = 1;
export const TILE_SPACING = 2;

/**
 * Copy of the tile sheet with each tile's edge pixels repeated around it, so a camera at a
 * fractional position never samples the neighbouring tile (thin flickering seams).
 */
function makeExtrudedTiles(scene: Phaser.Scene): void {
  const src = scene.textures.get("tiles").getSourceImage() as HTMLImageElement;
  const size = 18;
  const cols = src.width / size;
  const rows = src.height / size;
  const step = size + TILE_SPACING;
  const canvas = scene.textures.createCanvas("tiles-extruded", cols * step, rows * step)!;
  const ctx = canvas.getContext();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * size;
      const sy = r * size;
      const dx = TILE_MARGIN + c * step;
      const dy = TILE_MARGIN + r * step;
      ctx.drawImage(src, sx, sy, size, size, dx, dy, size, size);
      ctx.drawImage(src, sx, sy, size, 1, dx, dy - 1, size, 1);
      ctx.drawImage(src, sx, sy + size - 1, size, 1, dx, dy + size, size, 1);
      ctx.drawImage(src, sx, sy, 1, size, dx - 1, dy, 1, size);
      ctx.drawImage(src, sx + size - 1, sy, 1, size, dx + size, dy, 1, size);
    }
  }
  canvas.refresh();
}

export const BIKE_SIZE = 32;

/** Pixel-perfect line with a square brush (canvas lines would blur). */
function pixelLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w = 1): void {
  ctx.fillStyle = color;
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    ctx.fillRect(x - Math.floor(w / 2), y - Math.floor(w / 2), w, w);
  }
}

/** Scales a colour's brightness (below 1 darkens). */
function shade(color: number, factor: number): string {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return hex(Phaser.Display.Color.GetColor(f(c.red), f(c.green), f(c.blue)));
}

/**
 * Full-suspension mountain bike with the kid pedalling; the photo head is added on top in-game.
 * Frames 0-3 pedal round; frames 4-6 are the suspension compressed by 1-3 px on landing.
 * Wheels sit at x 7 and 25 with the ground on the bottom row. Everything is set pixel by pixel so
 * nothing gets blurry edges.
 */
function makeBike(scene: Phaser.Scene, c: CharacterDef): void {
  const pedalFrames = 4;
  const variants: { crank: number; sag: number }[] = [
    ...Array.from({ length: pedalFrames }, (_, f) => ({ crank: (f / pedalFrames) * Math.PI * 2, sag: 0 })),
    { crank: 0, sag: 1 },
    { crank: 0, sag: 2 },
    { crank: 0, sag: 3 },
  ];
  const canvas = scene.textures.createCanvas(`bike-${c.id}`, BIKE_SIZE * variants.length, BIKE_SIZE)!;
  const ctx = canvas.getContext();
  variants.forEach(({ crank, sag }, f) => {
    ctx.save();
    ctx.translate(f * BIKE_SIZE, 0);
    drawBike(ctx, c, crank, (f % pedalFrames) * (Math.PI / 8), sag);
    ctx.restore();
    canvas.add(f, 0, f * BIKE_SIZE, 0, BIKE_SIZE, BIKE_SIZE);
  });
  canvas.refresh();
}

/** `sag` lowers the frame and rider onto the wheels: the fork's gold stanchion and the shock shorten. */
function drawBike(ctx: CanvasRenderingContext2D, c: CharacterDef, crank: number, turn: number, sag: number): void {
  const tire = "#2b2233";
  const rim = "#c8ccd8";
  const spoke = "#8a90a8";
  const black = "#1d1b2a";
  const gold = "#e8c060";
  const spring = "#ff9f1c";
  const silver = "#d0d4e0";
  const frameColor = hex(c.shirt);
  const frameShadow = shade(c.shirt, 0.7);
  const jersey = shade(c.shirt, 0.55);
  const skin = "#f2c29b";
  const WHEEL_Y = 25;
  const line = (x0: number, y0: number, x1: number, y1: number, color: string, w = 1) => pixelLine(ctx, x0, y0, x1, y1, color, w);
  const dot = (x: number, y: number, color: string, w = 1, h = w) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  // Everything sprung (frame, rider) is drawn `s` pixels lower.
  const s = sag;

  // Wheels, pixel by pixel: knobbly tyre, rim, two spokes, disc rotor, hub.
  for (const hx of [7, 25]) {
    for (let y = WHEEL_Y - 8; y <= WHEEL_Y + 8; y++) {
      for (let x = hx - 8; x <= hx + 8; x++) {
        const dx = x - hx;
        const dy = y - WHEEL_Y;
        const d = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx);
        const knob = Math.abs(Math.sin(4 * (a - turn))) > 0.7;
        if (d > 6.9 || y > 31) continue;
        if (d > 6.2) { if (knob) dot(x, y, tire); continue; }
        if (d > 4.6) { dot(x, y, tire); continue; }
        if (d > 3.7) { dot(x, y, rim); continue; }
        if (d < 0.8) { dot(x, y, black); continue; }
        if (d >= 1.5 && d < 2.4) { dot(x, y, silver); continue; }
        if (Math.abs(Math.sin(a - turn)) < 0.25 || Math.abs(Math.cos(a - turn)) < 0.25) dot(x, y, spoke);
      }
    }
  }

  // Rear end: chain stay and seat stay run from the axle up to the sprung frame.
  line(8, 24, 15, 24 + Math.min(s, 1), frameShadow, 2);
  line(8, 24, 12, 17 + s, frameShadow, 2);
  line(12, 17 + s, 14, 18 + s, black, 1);
  // Front triangle
  line(21, 16 + s, 16, 23 + Math.min(s, 1), frameColor, 2);
  line(20, 14 + s, 13, 16 + s, frameColor, 2);
  line(15, 23 + Math.min(s, 1), 12, 13 + s, frameColor, 2);
  line(21, 13 + s, 21, 17 + s, frameColor, 2);
  // Rear shock: black body with an orange spring that squashes as it compresses.
  line(14, 19 + s, 18, 20 + s, black, 2);
  dot(15, 19 + s, spring);
  if (s < 2) dot(17, 20 + s, spring);
  // Suspension fork: the gold stanchion slides into the fixed black lower leg.
  if (s < 3) line(21, 17 + s, 22, 20, gold, 2);
  line(22, 20, 25, 25, black, 2);
  // Cockpit: stem, wide riser bar.
  dot(21, 12 + s, black);
  line(19, 12 + s, 25, 11 + s, black, 1);
  // Dropper post and saddle
  line(12, 13 + s, 11, 11 + s, silver, 1);
  line(9, 10 + s, 13, 10 + s, black, 1);
  // Chainring and crank
  dot(14, 23, spoke, 3, 3);
  dot(15, 24, black);
  const foot = { x: 15 + Math.round(Math.cos(crank) * 3), y: 24 + Math.round(Math.sin(crank) * 3) };
  line(15, 24, foot.x, foot.y, black, 1);

  // Rider: leg on the pedal, body leaning forward to the bar.
  const knee = { x: Math.round((11 + foot.x) / 2) + 4, y: Math.round((10 + s + foot.y) / 2) - 2 };
  line(11, 9 + s, knee.x, knee.y, hex(c.pants), 2);
  line(knee.x, knee.y, foot.x, foot.y, hex(c.pants), 2);
  dot(foot.x - 1, foot.y, black, 3, 1);
  line(11, 9 + s, 16, 4 + s, jersey, 3);
  line(16, 5 + s, 21, 10 + s, jersey, 2);
  dot(21, 10 + s, skin, 2, 1);
}
