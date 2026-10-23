import Phaser from "phaser";
import { installTouchControls } from "./input/touch";
import { GAME_HEIGHT, GAME_WIDTH, ZOOM } from "./config";
import { Boot } from "./scenes/Boot";
import { CharacterSelect } from "./scenes/CharacterSelect";
import { Game } from "./scenes/Game";
import { Hud } from "./scenes/Hud";
import { LevelComplete } from "./scenes/LevelComplete";
import { Pause } from "./scenes/Pause";
import { Runner } from "./scenes/Runner";
import { RunnerOver } from "./scenes/RunnerOver";
import { Title } from "./scenes/Title";
import { Victory } from "./scenes/Victory";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1d1b2a",
  pixelArt: true,
  roundPixels: true,
  // Lanterns in view at once; Phaser only counts lights within camera range.
  maxLights: 16,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // The canvas only takes sizes that are whole multiples of the 384x216 world view, so every
    // world pixel is drawn as an exact square of screen pixels (no uneven pixel columns).
    snap: { width: GAME_WIDTH / ZOOM, height: GAME_HEIGHT / ZOOM },
  },
  input: { gamepad: true },
  // Step physics with the real frame time so motion stays smooth on 120 Hz screens too.
  physics: { default: "arcade", arcade: { debug: false, fixedStep: false } },
  scene: [Boot, Title, CharacterSelect, Game, Runner, Hud, Pause, LevelComplete, Victory, RunnerOver],
});

installTouchControls();

// Offline play once installed to the home screen.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
