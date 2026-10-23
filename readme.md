# lundenKidz

SNES-style side-scroller starring three kids. Browser game: Phaser 4 + TypeScript + Vite.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # logic + level checks
npm run build    # static build in dist/
```

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | Arrows | D-pad / left stick |
| Sprint (hold) | S / Shift | X or RB |
| Jump (hold = higher) | D / Space / Up / Z | A or B |
| Pause | Esc / P | Start |
| Confirm | Enter / Space / D | A / Start |
| Mute | M | |
| Wheelie (MTB Trail, on ground) | Left | D-pad left / stick |
| Backflip / frontflip (MTB Trail, in air) | Left / Right | D-pad / stick |

## Your kids

- Photos: `public/kids/ellen.png`, `emil.png`, `olle.png` (cut-out heads, transparent PNG; the game adds outline, shadow and 3D shading).
- Names, shirt colours and which pixel body (boy/girl) each kid uses: `src/characters.ts`.
- Pixel bodies and bikes: `public/assets/kids/` (32x32 sheets: idle/walk/run/jump rows, plus a biking sheet), recoloured per outfit in `src/objects/sprites.ts`.

## Levels

Five levels: Sunny Meadow → Rumble Cave → Snowy Hills (ice) → Cloud Climb (vertical) → Spooky Castle.

Plus **MTB Trail** (title menu, always open): the kid rides a mountain bike on their own, jump only,
faster and faster, ramps, gaps, rocks and logs, 3 Hearts, top-5 highscores with the kid's face. Pacing in `src/logic/runner.ts`, scene in `src/scenes/Runner.ts`.

ASCII maps in `src/levels/levels.ts`, 12+ rows tall (the camera scrolls up for taller ones). Legend in `src/levels/parse.ts`
(`#` ground, `B` block, `=` one-way platform, `~` cloud, `j` spring, `P` start, `G` Goal Flag, `c` Checkpoint,
`d` Diamond, `h` Heart Pickup, `w` Walker, `o` Hopper, `s` Spiky, `t` plant, `f` fence, `i` sign, `l` lantern, `L` light post).
`npm test` checks every level (things stand on ground, start + goal exist).

A level can also be a Tiled map: set `tiled: "assets/levels/<name>.tmj"` on its entry (Sunny Meadow is one);
the ASCII rows stay as fallback. See `docs/rendering.md` for the format and the generator script.

## Where things live

- `CONTEXT.md` — game vocabulary (Heart, Stomp, Checkpoint …)
- `docs/open-questions.md` — undecided design questions + defaults used meanwhile
- `docs/rendering.md` — Phaser 4 rendering: effect flags (`?bloom=0`, `?lights=1` …), parallax, particles, Light2D, Tiled levels, adding a sprite
- `src/fx/` — camera filters, parallax, particles, lights
- `src/logic/` — pure rules (Hearts, Stomp, Diamonds, saved progress), unit tested
- `src/scenes/` — Title, Character Select, Game, HUD, Pause, Level Complete, Victory
- `src/audio/` — synthesised chiptune music + sound effects (no audio files)

Art: [Kenney Pixel Platformer](https://kenney.nl/assets/pixel-platformer) (CC0). Font: Press Start 2P (OFL).
