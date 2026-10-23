import Phaser from "phaser";

/**
 * Normal maps
 * ===========
 * Phaser 4 lighting (WebGL only) shades lit objects per pixel using a normal map. Without one, a lit
 * object uses a built-in flat normal map: it still brightens/darkens with distance to lights and the
 * ambient color, but looks like a flat surface (no relief). So normal maps are optional polish.
 *
 * Loading (the loader takes the normal map next to the texture; same path/baseURL/CORS rules):
 *
 *   // image: URL array [texture, normalMap]
 *   this.load.image("brick", ["assets/brick.png", "assets/brick_n.png"]);
 *
 *   // spritesheet, config-object form (the typed `spritesheet(key, url: string, ...)` overload in
 *   // phaser.d.ts does not accept an array, so use this form in TypeScript):
 *   this.load.spritesheet({
 *     key: "player",
 *     url: "assets/player.png",
 *     normalMap: "assets/player_n.png",
 *     frameConfig: { frameWidth: 18, frameHeight: 18 },
 *   });
 *   // JS-only shorthand from the Phaser docs:
 *   // this.load.spritesheet("player", ["player.png", "player_n.png"], { frameWidth: 18, frameHeight: 18 });
 *
 * Then opt the object in: `sprite.setLighting(true)` (see litIfEnabled). Optional contact shadows from
 * surface relief: `sprite.setSelfShadow(true)`.
 *
 * Generating one for pixel art: paint a height/bump layer in Aseprite (grayscale: lighter = raised) and
 * convert with Laigter (free) or SpriteIlluminator; or hand-paint normals. Export with nearest-neighbour
 * and no filtering/smoothing.
 *
 * Alignment: the normal map must be exactly the same pixel size as the texture, with frames at the same
 * positions 1:1 (same frameWidth/frameHeight, margin and spacing). Frame N of the sheet samples frame N of
 * the normal map. Do not trim, pad, or rescale either file independently.
 *
 * Canvas renderer: lighting and normal maps are ignored (objects draw unlit).
 */

/**
 * Turns on the scene's lights when `enabled` and the renderer is WebGL.
 * With lights enabled, objects that do NOT call setLighting(true) are drawn exactly as before
 * (lighting is a per-object shader opt-in, v4 `Lighting` component), so the scene can opt in object by
 * object; only opted-in objects are darkened by `ambient` and brightened by lights.
 * Returns whether lighting is active.
 */
export function enableLights(scene: Phaser.Scene, enabled: boolean, ambient = 0x8a8aa0): boolean {
  if (!enabled || scene.sys.game.renderer.type !== Phaser.WEBGL) return false;
  scene.lights.enable().setAmbientColor(ambient);
  return true;
}

function hasLighting(obj: Phaser.GameObjects.GameObject): obj is Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Lighting {
  return typeof (obj as Partial<Phaser.GameObjects.Components.Lighting>).setLighting === "function";
}

/** setLighting(true) when `enabled` and the object supports it (Image, Sprite, TilemapLayer, ...). */
export function litIfEnabled<T extends Phaser.GameObjects.GameObject>(obj: T, enabled: boolean): T {
  if (enabled && hasLighting(obj)) obj.setLighting(true);
  return obj;
}

export type LanternKind = "lantern" | "post";
export const LANTERN_TEXTURE = "lantern";
export const POST_TEXTURE = "light-post";
/** Glass centre, as an offset from the sprite's bottom-centre (x, y). */
const GLASS_DY: Record<LanternKind, number> = { lantern: -5, post: -25 };

/** "." transparent, O dark frame, Y warm glass, H highlight, G hook. */
const LANTERN_SHAPE = [
  "...GG...",
  "..G..G..",
  "..OOOO..",
  ".OYYYYO.",
  ".OYHYYO.",
  ".OYYYYO.",
  ".OYYYYO.",
  ".OYYYYO.",
  "..OOOO..",
  ".OOOOOO.",
  "........",
  "........",
];
/** Tall street light: lamp head on an iron pole with a footed base. */
const POST_SHAPE = [
  "..OOOO..",
  ".OYYYYO.",
  ".OYHYYO.",
  ".OYYYYO.",
  "..OOOO..",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "...GG...",
  "..GGGG..",
  ".GGGGGG.",
  ".OOOOOO.",
];
const LANTERN_PALETTE: Record<string, string> = {
  O: "#2a2018",
  Y: "#ffc850",
  H: "#fff2b0",
  G: "#4a4a50",
};
const SHAPES: Record<LanternKind, { key: string; rows: string[] }> = {
  lantern: { key: LANTERN_TEXTURE, rows: LANTERN_SHAPE },
  post: { key: POST_TEXTURE, rows: POST_SHAPE },
};

function makeLanternTexture(scene: Phaser.Scene, kind: LanternKind): void {
  const { key, rows } = SHAPES[kind];
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, rows[0].length, rows.length)!;
  const ctx = canvas.getContext();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = LANTERN_PALETTE[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  canvas.refresh();
}

export interface Lantern {
  sprite: Phaser.GameObjects.Image;
  /** Soft additive halo behind the glass; absent when `halo` is off. */
  halo?: Phaser.GameObjects.Image;
  light?: Phaser.GameObjects.Light;
  destroy(): void;
}

const HALO_TEXTURE = "lantern-halo";
const HALO_SIZE = 48;

/** Radial gradient, linear-filtered so it stays smooth at zoom 3 (the Glow filter boxes small sprites). */
function makeHaloTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(HALO_TEXTURE)) return;
  const canvas = scene.textures.createCanvas(HALO_TEXTURE, HALO_SIZE, HALO_SIZE)!;
  const ctx = canvas.getContext();
  const c = HALO_SIZE / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
  canvas.refresh();
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/**
 * Pixel lantern (or tall light post) standing at (x, y) (bottom-centre) with an optional warm point
 * light at the glass and a gentle flicker. With `enabled` false only the sprite is created.
 */
export function addLantern(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: { kind?: LanternKind; color?: number; radius?: number; intensity?: number; flicker?: boolean; enabled?: boolean; halo?: boolean } = {},
): Lantern {
  const { kind = "lantern", color = 0xffb060, radius = kind === "post" ? 90 : 70, intensity = 1.2, flicker = true, enabled = true } = opts;
  makeLanternTexture(scene, kind);
  const sprite = scene.add.image(x, y, SHAPES[kind].key).setOrigin(0.5, 1).setDepth(1);

  let halo: Phaser.GameObjects.Image | undefined;
  if (opts.halo ?? true) {
    makeHaloTexture(scene);
    halo = scene.add
      .image(x, y + GLASS_DY[kind], HALO_TEXTURE)
      .setDepth(0.9)
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.3)
      .setScale(kind === "post" ? 0.8 : 0.6);
    scene.tweens.add({ targets: halo, alpha: 0.42, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut", delay: (x * 7) % 420 });
  }

  let light: Phaser.GameObjects.Light | undefined;
  let tween: Phaser.Tweens.Tween | undefined;
  if (enabled) {
    // z is the light's height above lit objects (at z=0); strong values are 0..radius/2.
    light = scene.lights.addLight(x, y + GLASS_DY[kind], radius, color, intensity, radius * 0.3);
    if (flicker) {
      tween = scene.tweens.add({
        targets: light,
        intensity: intensity * 0.85,
        radius: radius * 0.94,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
  }

  let destroyed = false;
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    tween?.stop();
    if (light) scene.lights.removeLight(light);
    halo?.destroy();
    sprite.destroy();
  };
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    if (destroyed) return;
    destroyed = true;
    tween?.stop();
    if (light) scene.lights.removeLight(light);
    halo?.destroy();
  });
  return { sprite, halo, light, destroy };
}
