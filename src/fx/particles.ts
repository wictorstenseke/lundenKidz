import Phaser from "phaser";

const PIXEL = "fx-pixel"; // 1x1 white; integer `scale` (1/2/3) gives 1/2/3px squares
const LEAF = "fx-leaf"; // 3x2 white leaf
const DROP = "fx-drop"; // 1x4 white streak

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

function ensureDrop(scene: Phaser.Scene): void {
  if (scene.textures.exists(DROP)) return;
  const canvas = scene.textures.createCanvas(DROP, 1, 4)!;
  const ctx = canvas.getContext();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1, 4);
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

/**
 * Dust kicked up behind a rolling wheel. The caller moves it to the wheel each frame and switches
 * `emitting` on while the wheel is on the ground; `frequency` can be lowered as speed rises.
 */
export function trailDust(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter {
  ensurePixel(scene);
  const emitter = scene.add.particles(0, 0, PIXEL, {
    frequency: 60,
    lifespan: { min: 250, max: 450 },
    speedX: { min: -30, max: -10 },
    speedY: { min: -18, max: -4 },
    gravityY: 70,
    scale: [1, 1, 2],
    alpha: { start: 0.7, end: 0 },
    tint: [0xe8dcc8, 0xc8b8a0, 0xa89880],
    x: { min: -2, max: 2 },
    y: { min: -1, max: 0 },
    emitting: false,
  });
  emitter.setDepth(9);
  return emitter;
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
  return followCamera(scene, emitter, follow);
}

/**
 * Steady rain over the main camera view. Same world-space-emitter-glued-to-the-view trick as
 * ambientLeaves, but the drops are fast, short-lived and slanted, so they only need to cover the
 * view plus a little margin for the slant.
 */
export function ambientRain(scene: Phaser.Scene, opts: { density?: number; depth?: number } = {}): { destroy(): void } {
  ensureDrop(scene);
  const cam = scene.cameras.main;
  const density = Math.max(0.05, opts.density ?? 1);
  const view = cam.worldView;
  const pad = 40;

  const emitter = scene.add.particles(view.x, view.y - 8, DROP, {
    frequency: 18 / density,
    lifespan: 900,
    emitZone: {
      type: "random",
      source: {
        getRandomPoint: (pt) => {
          pt.x = Phaser.Math.FloatBetween(-pad, cam.worldView.width + pad);
          pt.y = 0;
        },
      },
    },
    speedY: { min: 240, max: 320 },
    speedX: { min: -50, max: -36 },
    rotate: 10,
    scaleY: { min: 1, max: 2 },
    alpha: { start: 0.55, end: 0.25 },
    tint: [0xcfe4ff, 0xa9c4e8],
    advance: 900,
  });
  emitter.setDepth(opts.depth ?? 9);

  const follow = (): void => {
    const v = cam.worldView;
    emitter.setPosition(v.x, v.y - 8);
  };
  return followCamera(scene, emitter, follow);
}

/** Glowing embers drifting up from below the view, for the volcano. */
export function ambientEmbers(scene: Phaser.Scene, opts: { density?: number; depth?: number } = {}): { destroy(): void } {
  ensurePixel(scene);
  const cam = scene.cameras.main;
  const density = Math.max(0.05, opts.density ?? 1);
  const view = cam.worldView;
  const pad = 16;

  const emitter = scene.add.particles(view.x, view.bottom + 4, PIXEL, {
    frequency: 140 / density,
    lifespan: { min: 2600, max: 4200 },
    emitZone: {
      type: "random",
      source: {
        getRandomPoint: (pt) => {
          pt.x = Phaser.Math.FloatBetween(-pad, cam.worldView.width + pad);
          pt.y = 0;
        },
      },
    },
    speedY: { min: -46, max: -22 },
    speedX: { min: -8, max: 8 },
    accelerationX: { min: -6, max: 6 },
    maxVelocityX: 14,
    scale: [1, 1, 2],
    alpha: { start: 1, end: 0 },
    tint: [0xffd060, 0xff8a30, 0xff5a20],
    blendMode: Phaser.BlendModes.ADD,
    advance: 3000,
  });
  emitter.setDepth(opts.depth ?? 8);

  const follow = (): void => {
    const v = cam.worldView;
    emitter.setPosition(v.x, v.bottom + 4);
  };
  return followCamera(scene, emitter, follow);
}

/** Keeps `follow` running each POST_UPDATE until the emitter is destroyed or the Scene shuts down. */
function followCamera(scene: Phaser.Scene, emitter: Phaser.GameObjects.Particles.ParticleEmitter, follow: () => void): { destroy(): void } {
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
