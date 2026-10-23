# Kid sprite sheets

- `boy.png`, `girl.png`: 256x128, 8 columns x 4 rows of 32x32 frames, facing right (the game flips for left).
  Rows: idle, walk, run, jump (anticipation, takeoff, rise tuck, rise, apex, fall, land, recover). Feet at (16, 30).
- `bikes.png`: 256x128; rows: boy right, girl right, boy left, girl left. 8-frame pedal loop. Wheels touch at y=30.

Generated pixel art (image_gen), 48-colour palette. Clothes are recoloured per outfit at boot; the pixel heads are
covered by the kids' photos (see `src/objects/sprites.ts`).
