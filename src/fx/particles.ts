import Phaser from "phaser";

const PIXEL = "fx-pixel"; // 1x1 white; integer `scale` (1/2/3) gives 1/2/3px squares
const LEAF = "fx-leaf"; // 3x2 white leaf

function ensurePixel(scene: Phaser.Scene): void {
  if (scene.textures.exists(PIXEL)) return;
  const canvas = scene.textures.createCanvas(PIXEL, 1, 1)!;
  const ctx = canvas.getContext();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1, 1);
  canvas.refresh();
}

function ensureLeaf(scene: Phaser.Scene): void {
  if (scene.textures.exists(LEAF)) return;
  const canvas = scene.textures.createCanvas(LEAF, 3, 2)!;
  const ctx = canvas.getContext();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 2, 1);
  ctx.fillRect(1, 1, 2, 1);
  canvas.refresh();
}

/** Destroy a one-shot emitter once its last particle (max lifespan) has expired. */
function destroyAfter(scene: Phaser.Scene, emitter: Phaser.GameObjects.Particles.ParticleEmitter, ms: number): void {
  scene.time.delayedCall(ms + 50, () => {
    if (emitter.scene) emitter.destroy();
  });
}

/** Grey/white puff spreading left/right from the feet (x, y = feet). strength ~1 normal, 2+ hard landing. */
export function landingDust(scene: Phaser.Scene, x: number, y: number, strength = 1): void {
  ensurePixel(scene);
  const s = Phaser.Math.Clamp(strength, 0.5, 2.5);
  const count = Phaser.Math.Clamp(Math.round(5 + 2.5 * s), 6, 10);
  const maxLife = 400;
  const emitter = scene.add.particles(x, y, PIXEL, {
    emitting: false,
    lifespan: { min: 250, max: maxLife },
    speedX: { min: -35 * s, max: 35 * s },
    speedY: { min: -22 * s, max: -4 },
    gravityY: 90,
    scale: [1, 1, 2], // integer steps only
    alpha: { start: 0.9, end: 0 },
    tint: [0xffffff, 0xe0e0e0, 0xb8b8b8],
    x: { min: -4, max: 4 },
    y: { min: -1, max: 0 },
  });
  emitter.setDepth(9);
  emitter.explode(count);
  destroyAfter(scene, emitter, maxLife);
}

/** Generic additive pickup sparkle (hearts, items). Diamonds keep their own burstDiamond. */
export function itemSparkle(scene: Phaser.Scene, x: number, y: number, color = 0xffffff): void {
  ensurePixel(scene);
  const maxLife = 450;
  const emitter = scene.add.particles(x, y, PIXEL, {
    emitting: false,
    lifespan: { min: 300, max: maxLife },
    speed: { min: 25, max: 65 },
    angle: { min: 0, max: 360 },
    gravityY: -10,
    scale: [1, 1, 2],
    alpha: { start: 1, end: 0 },
    tint: color,
    blendMode: Phaser.BlendModes.ADD,
  });
  emitter.setDepth(20);
  emitter.explode(Phaser.Math.Between(8, 12));
  destroyAfter(scene, emitter, maxLife);
}

/**
 * Continuous falling leaves over the main camera view.
 *
 * Design: emitter lives in WORLD space and is re-positioned to the top edge of camera.worldView each
 * frame (POST_UPDATE). worldView is already in world units (accounts for zoom 3), so no scroll-factor /
 * zoom-centre maths is needed (setScrollFactor(0) would be drawn around the zoom pivot, not the corner).
 * Already-spawned leaves stay in the world, which reads as natural ambience when the camera scrolls.
 */
export function ambientLeaves(
  scene: Phaser.Scene,
  opts: { color?: number; accent?: number; density?: number; depth?: number } = {},
): { destroy(): void } {
  ensureLeaf(scene);
  const cam = scene.cameras.main;
  const density = Math.max(0.05, opts.density ?? 1);
  const color = opts.color ?? 0x6f9a3a;
  const view = cam.worldView;
  const pad = 24; // leaves drift sideways; spawn a bit beyond the edges

  const emitter = scene.add.particles(view.x, view.y - 6, LEAF, {
    frequency: 550 / density, // ~1.8/s at 8s avg life -> ~15 on screen
    lifespan: { min: 6000, max: 10000 },
    emitZone: {
      type: "random",
      source: {
        getRandomPoint: (pt) => {
          pt.x = Phaser.Math.FloatBetween(-pad, cam.worldView.width + pad);
          pt.y = 0;
        },
      },
    },
    speedY: { min: 12, max: 24 },
    speedX: { min: -6, max: 6 },
    accelerationX: { min: -6, max: 6 }, // random gentle push -> sway
    maxVelocityX: 18,
    rotate: { start: 0, end: 180 },
    alpha: { start: 1, end: 0.6 },
    tint: [color, Phaser.Display.Color.ValueToColor(color).darken(20).color, opts.accent ?? 0x9c7a3c],
    advance: 6000, // pre-warm so the view isn't empty at start
  });
  emitter.setDepth(opts.depth ?? 8);

  const follow = (): void => {
    const v = cam.worldView;
    emitter.setPosition(v.x, v.y - 6);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, follow);

  let dead = false;
  const destroy = (): void => {
    if (dead) return;
    dead = true;
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, follow);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, destroy);
    emitter.destroy();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  return { destroy };
}
