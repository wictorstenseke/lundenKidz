# Open questions

Round 3 of the design grilling, parked for later. The game currently uses the recommended
default for each; change any by answering it.

| # | Question | Default in the game now |
| --- | --- | --- |
| 1 | What are Diamonds for? (score / 100 = +1 Heart / spend on stuff) | 100 Diamonds = +1 Heart; count shown on Level Complete |
| 2 | One player at a time, or 2-player co-op? | One at a time; kids take turns per Level |
| 3 | When is the Character picked? (game start / each Level / pause menu) | Before each Level |
| 4 | Falling in a pit: lose a Heart + respawn at edge / back to Checkpoint / no pits | Lose 1 Heart, respawn at last safe ground |
| 5 | Checkpoints: how many, what's kept? | 1–2 per Level; restart with 5 Hearts, Diamonds kept, Enemies return |
| 6 | Hearts between Levels: reset or carry over? | Reset to 5 each Level |
| 7 | Controls feel: variable jump? run button? | Variable jump yes; no run button |
| 8 | Save progress between sessions? | Yes, unlocked Levels + Diamond total in browser storage |
| 9 | Level themes | Sunny Meadow → Rumble Cave → Snowy Hills → Cloud Climb → Spooky Castle |
| 10 | Menus | Title (level list) → Character Select → Level → Level Complete → …; Pause: resume/restart/quit; no timer |

## Also not decided yet

- ~~Kids' real names and photos~~ — done (Ellen, Emil, Olle in `src/characters.ts`, photos in `public/kids/`).
- Webcam hand-tracking controls (parked as a later option).
- Hosting (local only for now; GitHub Pages is the easy next step: `npm run build`, publish `dist/`).
- Levels are ASCII maps rather than Tiled files — simpler to edit by hand; switch to Tiled if level design grows.
- More ideas not chosen yet: moving platforms, flying enemy (bat).
