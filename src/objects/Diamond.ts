import Phaser from "phaser";

export const DIAMOND_TEXTURE = "diamond";
const GLOW_TEXTURE = "diamond-glow";
const GLINT_TEXTURE = "diamond-glint";

const GLOW_SIZE = 40;
const GLINT_SIZE = 11;

/**
 * Brilliant-cut gem, 14x13 inside an 18x18 frame with a 1px outline: flat table on top, wide girdle,
 * pointed pavilion.
 * Letters map to the palette below; "." is transparent.
 */
const SHAPE = [
  "..................",
  "..................",
  "......OOOOOO......",
  ".....OWTTTTLO.....",
  "....OWTTTTTTMO....",
  "...OLLLMMMMMDDO...",
  "..OLLLLMMMMMDDDO..",
  "..OLLLLMMMMMDDDO..",
  "...OLLLMMMMMDDO...",
  "...OLLLMMMMMDDO...",
  "....OLLMMMMDDO....",
  ".....OLMMMDDO.....",
  "......OMMDDO......",
  ".......ODDO.......",
  "........OO........",
  "..................",
  "..................",
  "..................",
];

/** Facet seams drawn over the base fill, so the cut reads even at 18px. */
const SEAMS: [number, number][] = [
  // Crown: table corners down to the girdle corners.
  [4, 5], [3, 6],
  [13, 5], [14, 6],
  // Pavilion: two lines converging on the point.
  [5, 8], [5, 9], [6, 10], [6, 11], [7, 12],
  [12, 8], [12, 9], [11, 10], [11, 11], [10, 12],
];

const PALETTE: Record<string, string> = {
  O: "#1a2a4a",
  W: "#ffffff",
  T: "#b8f4ff",
  L: "#6fe0ff",
  M: "#2ab4f5",
  D: "#1368c4",
};
const SEAM_COLOR = "#1a8ad8";

export function makeDiamondTextures(scene: Phaser.Scene): void {
  makeGem(scene);
  makeGlow(scene);
  makeGlint(scene);
}

function makeGem(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas(DIAMOND_TEXTURE, 18, 18)!;
  const ctx = canvas.getContext();
  SHAPE.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = PALETTE[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  ctx.fillStyle = SEAM_COLOR;
  for (const [x, y] of SEAMS) ctx.fillRect(x, y, 1, 1);
  canvas.refresh();
}

/** Soft radial halo, tinted and additively blended in-game. */
function makeGlow(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas(GLOW_TEXTURE, GLOW_SIZE, GLOW_SIZE)!;
  const ctx = canvas.getContext();
  const c = GLOW_SIZE / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
  canvas.refresh();
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** Four-point star: long cross arms, short diagonals. */
function makeGlint(scene: Phaser.Scene): void {
  const canvas = scene.textures.createCanvas(GLINT_TEXTURE, GLINT_SIZE, GLINT_SIZE)!;
  const ctx = canvas.getContext();
  const c = Math.floor(GLINT_SIZE / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, c, GLINT_SIZE, 1);
  ctx.fillRect(c, 0, 1, GLINT_SIZE);
  for (const d of [-1, 1]) {
    ctx.fillRect(c + d, c + d, 1, 1);
    ctx.fillRect(c + d, c - d, 1, 1);
  }
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (const d of [-2, 2]) {
    ctx.fillRect(c + d, c + d, 1, 1);
    ctx.fillRect(c + d, c - d, 1, 1);
  }
  canvas.refresh();
}

/**
 * Idle sparkle for a placed diamond: a faint pulsing halo behind it plus the slow spin.
 * Everything is torn down when the diamond is destroyed.
 */
export function attachDiamondBling(scene: Phaser.Scene, img: Phaser.GameObjects.Image, spinDelay = 0): void {
  const glow = scene.add
    .image(img.x, img.y, GLOW_TEXTURE)
    .setDepth(img.depth - 0.1)
    .setTint(0x5fd8ff)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.12)
    .setScale(0.55);

  scene.tweens.add({ targets: img, scaleX: 0.6, duration: 500, yoyo: true, repeat: -1, ease: "Sine.inOut", delay: spinDelay });
  scene.tweens.add({
    targets: glow,
    alpha: 0.28,
    scale: 0.7,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
    delay: spinDelay % 900,
  });

  img.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.tweens.killTweensOf(glow);
    glow.destroy();
  });
}

/** Small sparkle burst at a pickup; the diamond itself is gone by now. */
export function burstDiamond(scene: Phaser.Scene, x: number, y: number, depth = 0): void {
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
    const dist = Phaser.Math.Between(10, 18);
    const star = scene.add
      .image(x, y, GLINT_TEXTURE)
      .setDepth(depth + 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(Phaser.Math.FloatBetween(0.6, 1));
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist - 4,
      scale: 0,
      angle: 90,
      duration: Phaser.Math.Between(260, 380),
      ease: "Quad.out",
      onComplete: () => star.destroy(),
    });
  }
  const flash = scene.add
    .image(x, y, GLOW_TEXTURE)
    .setDepth(depth + 0.4)
    .setTint(0xbdf3ff)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.6);
  scene.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 260, ease: "Quad.out", onComplete: () => flash.destroy() });
}
