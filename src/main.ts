import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
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
  // Rounding each sprite separately makes them twitch against a smoothly following camera.
  roundPixels: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  // Step physics with the real frame time so motion stays smooth on 120 Hz screens too.
  physics: { default: "arcade", arcade: { debug: false, fixedStep: false } },
  scene: [Boot, Title, CharacterSelect, Game, Runner, Hud, Pause, LevelComplete, Victory, RunnerOver],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
