import Phaser from "phaser";
import { CHARACTERS, getOutfit, type CharacterDef } from "../characters";
import { FONT, SCENES } from "../config";
import { LEVELS } from "../levels/levels";
import { THEMES } from "../levels/themes";
import { makeDiamondTextures } from "../objects/Diamond";
import { makeBike, makeBody, SHEET } from "../objects/sprites";

/** Cache key of a Level's Tiled JSON, when it has one. */
export const levelJsonKey = (levelIndex: number): string => `level-${levelIndex}`;

export const HEAD_SIZE = 96;

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
    // The kids' pixel bodies and bikes; dressed per Character in create().
    this.load.image(SHEET.boy, "assets/kids/boy.png");
    this.load.image(SHEET.girl, "assets/kids/girl.png");
    this.load.image(SHEET.bikes, "assets/kids/bikes.png");
    // Tiled Levels; a Level whose file fails to load falls back to its ASCII rows in Game.
    for (const [i, def] of LEVELS.entries()) if (def.tiled) this.load.json(levelJsonKey(i), def.tiled);
  }

  async create(): Promise<void> {
    await loadFont();
    for (const c of CHARACTERS) {
      makeHead(this, c);
      makeBody(this, c.id, c.sprite, getOutfit(c.id));
      makeBike(this, c.id, c.sprite, getOutfit(c.id));
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
