import Phaser from "phaser";

const FOG_TEXTURE = "fx-fog";
const STAR_TEXTURE = "fx-star";

/** Soft white ellipse, linear-filtered so it stays smooth at zoom 3. */
function ensureFog(scene: Phaser.Scene): void {
  if (scene.textures.exists(FOG_TEXTURE)) return;
  const w = 96;
  const h = 28;
  const canvas = scene.textures.createCanvas(FOG_TEXTURE, w, h)!;
  const ctx = canvas.getContext();
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.5, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.scale(1, h / w);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();
  canvas.refresh();
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function ensureStar(scene: Phaser.Scene): void {
  if (scene.textures.exists(STAR_TEXTURE)) return;
  const canvas = scene.textures.createCanvas(STAR_TEXTURE, 3, 3)!;
  const ctx = canvas.getContext();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(1, 0, 1, 3);
  ctx.fillRect(0, 1, 3, 1);
  canvas.refresh();
}

/**
 * Fog banks drifting slowly along the ground. Each bank is glued to the camera view and wraps around
 * it, so the fog never runs out however far the Level scrolls. `groundY` is the world y the banks hug.
 */
export function ambientFog(scene: Phaser.Scene, groundY: number, opts: { count?: number; depth?: number; tint?: number } = {}): { destroy(): void } {
  ensureFog(scene);
  const cam = scene.cameras.main;
  const count = opts.count ?? 9;
  const rnd = new Phaser.Math.RandomDataGenerator(["fog"]);
  const banks = Array.from({ length: count }, (_, i) => ({
    img: scene.add
      .image(0, 0, FOG_TEXTURE)
      .setDepth(opts.depth ?? 9)
      .setTint(opts.tint ?? 0xc8c4e0)
      .setAlpha(rnd.realInRange(0.28, 0.45))
      .setScale(rnd.realInRange(1.4, 2.6), rnd.realInRange(0.8, 1.3)),
    offset: i * 70 + rnd.between(0, 50),
    lift: rnd.between(-2, 10),
    // Slower than the world, and each bank at its own pace, so they slide past one another.
    parallax: rnd.realInRange(0.75, 0.95),
    drift: rnd.realInRange(4, 10),
  }));

  const follow = (): void => {
    const v = cam.worldView;
    const span = v.width + 200;
    const t = scene.time.now / 1000;
    for (const b of banks) {
      b.img.setX(v.x - 100 + Phaser.Math.Wrap(b.offset - v.x * b.parallax + t * b.drift, 0, span));
      b.img.setY(groundY - b.lift + Math.sin(t * 0.4 + b.offset) * 1.5);
    }
  };
  follow();
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, follow);

  let dead = false;
  const destroy = (): void => {
    if (dead) return;
    dead = true;
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, follow);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, destroy);
    for (const b of banks) b.img.destroy();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  return { destroy };
}

/**
 * Twinkling stars scattered over the area the camera can see at a slow parallax, like the Game's
 * background clouds. Seeded so they stay put across restarts.
 */
export function scatterStars(scene: Phaser.Scene, worldW: number, worldH: number, seed: string, opts: { depth?: number } = {}): void {
  ensureStar(scene);
  const rnd = new Phaser.Math.RandomDataGenerator([seed]);
  const parallax = 0.1;
  const count = Math.ceil((worldW * worldH) / 2600);
  for (let i = 0; i < count; i++) {
    const x = rnd.between(-300, worldW * parallax + 500);
    const y = rnd.between(-320, worldH - 60);
    const big = rnd.frac() < 0.2;
    const star = scene.add
      .image(x, y, STAR_TEXTURE)
      .setScrollFactor(parallax, 1)
      .setDepth(opts.depth ?? -12.6)
      .setScale(big ? 1 : 0.34)
      .setAlpha(rnd.realInRange(0.4, 0.9));
    scene.tweens.add({
      targets: star,
      alpha: rnd.realInRange(0.15, 0.4),
      duration: rnd.between(900, 2400),
      yoyo: true,
      repeat: -1,
      delay: rnd.between(0, 2000),
      ease: "Sine.inOut",
    });
  }
}
