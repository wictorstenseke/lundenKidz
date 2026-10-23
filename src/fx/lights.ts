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

export const LANTERN_TEXTURE = "lantern";
const LANTERN_W = 8;
const LANTERN_H = 12;
/** Glass center in the texture, origin (0.5, 1): offset from the sprite's (x, y). */
const GLASS_DX = 0;
const GLASS_DY = -5;

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
const LANTERN_PALETTE: Record<string, string> = {
  O: "#2a2018",
  Y: "#ffc850",
  H: "#fff2b0",
  G: "#4a4a50",
};

function makeLanternTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(LANTERN_TEXTURE)) return;
  const canvas = scene.textures.createCanvas(LANTERN_TEXTURE, LANTERN_W, LANTERN_H)!;
  const ctx = canvas.getContext();
  LANTERN_SHAPE.forEach((row, y) => {
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
  light?: Phaser.GameObjects.Light;
  destroy(): void;
}

/**
 * Small pixel lantern at (x, y) (bottom-center) with an optional warm point light and gentle flicker.
 * With `enabled` false only the sprite is created.
 */
export function addLantern(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: { color?: number; radius?: number; intensity?: number; flicker?: boolean; enabled?: boolean } = {},
): Lantern {
  const { color = 0xffb060, radius = 70, intensity = 1.2, flicker = true, enabled = true } = opts;
  makeLanternTexture(scene);
  const sprite = scene.add.image(x, y, LANTERN_TEXTURE).setOrigin(0.5, 1).setDepth(1);

  let light: Phaser.GameObjects.Light | undefined;
  let tween: Phaser.Tweens.Tween | undefined;
  if (enabled) {
    // z is the light's height above lit objects (at z=0); strong values are 0..radius/2.
    light = scene.lights.addLight(x + GLASS_DX, y + GLASS_DY, radius, color, intensity, radius * 0.3);
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
    sprite.destroy();
  };
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    if (destroyed) return;
    destroyed = true;
    tween?.stop();
    if (light) scene.lights.removeLight(light);
  });
  return { sprite, light, destroy };
}
