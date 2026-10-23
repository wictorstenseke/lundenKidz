# Rendering

How the game draws things on Phaser 4, which visual effects exist, how to switch them on and off, and
how to add a new sprite.

## What changed (Phaser 3 → 4)

- `phaser` is 4.2.1. The official migration checklist (`node_modules/phaser/skills/v3-to-v4-migration/SKILL.md`)
  was walked against the code. Nothing here used custom pipelines, pre/postFX, masks, `setTintFill`,
  `Geom.Point`, `Struct.Set/Map`, `RenderTexture`/`DynamicTexture` or lighting, so the only code change
  was `Tilemap.createLayer()`, which can now return a GPU layer: `createTerrain` in `src/scenes/Game.ts`
  asks for the classic `TilemapLayer` so per-tile collision and tint keep working.
- Generated `CanvasTexture`s (heads, bodies, bikes, diamonds, backdrops) are unchanged; `createCanvas` →
  draw → `refresh()` still works the same.
- Game config (`src/main.ts`): `pixelArt: true` (nearest-neighbour sampling, no antialias) and
  `roundPixels: true` (Phaser 4 rounds only axis-aligned, unscaled objects, so there is no twitching against
  the smooth camera as there was in v3). The canvas is `1152x648` with the main camera at zoom 3, so the
  world view is `384x216`; `scale.snap` is set to that size, which makes the canvas only take whole multiples
  of it. Every world pixel is therefore an exact square of screen pixels.
- Base resolution is unchanged: 18 px tiles, 24 px characters.

Phaser's own AI skills live in `node_modules/phaser/skills/*/SKILL.md`; the typings in
`node_modules/phaser/types/phaser.d.ts` are the API reference. Do not use Phaser 3 habits (`preFX`,
`setPipeline('Light2D')`, `Bloom` FX).

## Effect flags

All effects are in `src/fx/`. `src/fx/flags.ts` reads the URL once at startup:

| Flag | Default | URL | What it does |
| --- | --- | --- | --- |
| `bloom` | on | `?bloom=0` | Bright highlights (clouds, glints, diamond halo) bleed softly. Camera internal filter: threshold → blur → ADD, same recipe as `Phaser.Actions.AddEffectBloom`. |
| `vignette` | on | `?vignette=0` | Gentle darkening towards the screen edges. Camera external filter. |
| `glow` | on | `?glow=0` | Per-object glow filter (`addGlow`), used on the lantern. |
| `lights` | off | `?lights=1` | Light2D: ambient light darkens opted-in objects, point lights brighten them. |

`?fx=0` turns everything off first, then per-flag params still apply (`?fx=0&bloom=1` is bloom only).
Values accept `0/1`, `on/off`, `true/false`.

The numbers live in `FX_TUNING` in `src/fx/filters.ts`. Two things to know when tuning:

- The Threshold filter is per colour channel, not luminance. The meadow sky is `#7ff0a5` (green 0.94),
  so the bloom threshold sits at 0.95; lowering it makes the whole sky glow.
- The Vignette shader is fully dark *outside* its radius (normalised distance from the centre; corners are
  at 0.71) and darkens by `sin(d / radius * π * strength)` inside. Keep the radius well above 0.71 and the
  strength low for a soft fall-off.

To compare at runtime from the console (`game` is on `window` in dev):

```js
const cam = game.scene.getScene("Game").cameras.main;
cam.filters.internal.list[0].active = false; // bloom
cam.filters.external.list[0].active = false; // vignette
```

## Modules

| File | Purpose |
| --- | --- |
| `src/fx/flags.ts` | `FX` flags + `parseFxFlags(search)` (unit tested). |
| `src/fx/filters.ts` | `applyCameraFx(camera)` → bloom + vignette handles with `setBloom/setVignette`; `addGlow(obj, color, strength)`. |
| `src/fx/parallax.ts` | `createParallax(scene, theme, worldW, worldH)`: sky / far / near bands cut from the Kenney `backgrounds.png` rows (24 px each), scroll factors 0.1 / 0.25 / 0.45, glued to the camera; call `update()` each frame. The Game scene uses it; MTB Trail keeps its own strip. |
| `src/fx/particles.ts` | `landingDust(scene, x, y, strength)`, `itemSparkle(scene, x, y, color)`, `ambientLeaves(scene, { color, accent, density, depth })`. All on tiny generated pixel textures with integer scales. |
| `src/fx/lights.ts` | `enableLights(scene, enabled, ambient)`, `litIfEnabled(obj, enabled)`, `addLantern(scene, x, y, opts)`; normal-map notes in the header comment. |
| `src/levels/tiled.ts` | `parseTiledLevel(json)` and `levelFromRows(rows)` (the inverse, used by the generator script). |

Where they are wired in:

- `Game.create`: `enableLights` → `createBackdrop` (parallax + clouds) → terrain (`litIfEnabled`) → decor,
  enemies, player (`litIfEnabled`) → lantern two tiles right of the start (`addLantern` + `addGlow`) →
  `applyCameraFx` → `ambientLeaves` (leaves in the meadow, snowflakes on Snowy Hills).
- `Game.update`: `parallax.update()` every frame; `trackLanding()` puffs dust when the Player touches down
  faster than 120 px/s; `takeHeart` sparkles.
- `Runner.create`/`trackLanding`/`pickUp`: camera FX, leaves, dust on touchdown, heart sparkle.

## Light2D

With `?lights=1` (WebGL only) the scene's `LightsManager` is enabled with ambient `0x8a8aa0`. Only objects
that call `setLighting(true)` are affected (the v4 `Lighting` component replaces `setPipeline('Light2D')`);
everything else draws exactly as before. The Game scene opts in the terrain layer, decor, enemies and the
Player body (the photo head stays unlit on purpose). The lantern adds a warm point light
(`scene.lights.addLight(x, y, radius, color, intensity, z)`) with a flicker tween. Lights have a `z` height
in v4; the lantern uses `radius * 0.3`.

### Loading a normal map alongside a spritesheet

Without a normal map a lit object uses a flat built-in one: it still brightens and darkens with distance to
the lights, but shows no relief. To add one:

```ts
// Image: URL array [texture, normalMap]
this.load.image("brick", ["assets/brick.png", "assets/brick_n.png"]);

// Spritesheet: the typed overload wants a string URL, so use the config form in TypeScript
this.load.spritesheet({
  key: "chars",
  url: "assets/kenney/characters.png",
  normalMap: "assets/kenney/characters_n.png",
  frameConfig: { frameWidth: 24, frameHeight: 24 },
});
```

Then `sprite.setLighting(true)` (or `litIfEnabled`). Optional relief shadows: `sprite.setSelfShadow(true)`.

Rules: the normal map must be exactly the same pixel size as the texture with frames at the same positions
(same frame size, margin and spacing); frame N samples frame N of the normal map. Export both with
nearest-neighbour and no smoothing. For pixel art, paint a height layer in Aseprite and convert it with
Laigter or SpriteIlluminator, or hand-paint the normals.

## Tiled levels

A `LevelDef` may carry `tiled: "assets/levels/<name>.tmj"`. `Boot` preloads it as JSON and `Game` parses
it with `parseTiledLevel` into the same `ParsedLevel` the ASCII parser produces; if the file is missing the
`rows` are used. Rendering still autotiles from the terrain types, so a `.tmj` only says *what* a tile is,
not which frame to draw.

Conventions (see `src/levels/tiled.ts`):

- Orthogonal, 18x18 tiles, uncompressed tile data.
- Tile layer `terrain`: each tile id in the embedded `tiles` tileset has a custom property `terrain` =
  `ground | block | platform | cloud`.
- Object layer `objects`: `type` (or `class`) is one of `start goal checkpoint diamond heart spring walker
  hopper spiky plant fence sign`. Tile objects (with a `gid`) have their origin bottom-left; point objects
  top-left. Positions snap to the grid cell.

Generate a `.tmj` from a hard-coded Level, then edit it in Tiled:

```sh
node scripts/ascii-to-tmj.mjs 0 public/assets/levels/sunny-meadow.tmj
```

`src/levels/tiled.test.ts` round-trips every Level through `levelFromRows` → `parseTiledLevel` and checks
that `sunny-meadow.tmj` matches the ASCII Sunny Meadow.

## Adding a new sprite

1. **Aseprite**: draw on a frame grid that matches the sheet (24x24 for characters, 18x18 for tiles). Keep
   the sprite's feet on the bottom row of the frame. File → Export Sprite Sheet: layout *By Rows*, no
   trimming, no padding (or set the same margin/spacing when loading), PNG, nearest-neighbour. Export a
   `_n.png` normal map the same way if the sprite should react to lights.
2. **Load** in `Boot.preload`:
   ```ts
   this.load.spritesheet("bat", "assets/bat.png", { frameWidth: 24, frameHeight: 24 });
   ```
   (the config form with `normalMap` if there is one, see above). Frames are numbered left to right, top to
   bottom.
3. **Animate** where the object is created, guarded so scene restarts do not recreate it:
   ```ts
   if (!scene.anims.exists("bat-fly")) {
     scene.anims.create({
       key: "bat-fly",
       frames: scene.anims.generateFrameNumbers("bat", { frames: [0, 1, 2, 1] }),
       frameRate: 8,
       repeat: -1,
     });
   }
   sprite.play("bat-fly");
   ```
4. **Place** it with `setOrigin(0.5, 1)` at the ground line and an integer position; use `setDepth` (terrain
   0–5, Player 10, head 11). Opt into lights with `litIfEnabled(sprite, this.lit)` and into a glow with
   `addGlow(sprite, color)` if it is a pickup or lantern.
5. Avoid fractional scales and rotations on pixel sprites; `roundPixels` only rounds unscaled, axis-aligned
   objects, so a scaled sprite shimmers.
