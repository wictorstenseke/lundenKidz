import Phaser from "phaser";
import { audio } from "../audio/audio";
import { SCENES } from "../config";
import { Controls } from "../input/controls";
import { handleGlobalKeys, Menu, text } from "../ui";
export interface PauseData {
  /** The scene that was paused. */
  target: string;
  /** Data that starts the paused scene over. */
  restartData: object;
}

export class Pause extends Phaser.Scene {
  private controls!: Controls;
  private menu!: Menu;
  private data_!: PauseData;

  constructor() {
    super(SCENES.pause);
  }

  init(data: PauseData): void {
    this.data_ = data;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    text(this, width / 2, height / 2 - 100, "Paused", 32, "#ffe066");
    this.menu = new Menu(this, width / 2, height / 2 - 20, [
      { label: "Resume", onSelect: () => this.resume() },
      { label: "Restart", onSelect: () => this.restart() },
      { label: "Quit to title", onSelect: () => this.quit() },
    ]);
    this.controls = new Controls(this);
  }

  update(): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    if (this.controls.pressed("pause") || this.controls.pressed("back")) return this.resume();
    this.menu.update(this.controls);
  }

  private resume(): void {
    this.scene.resume(this.data_.target);
    this.scene.stop();
  }

  private restart(): void {
    audio.stopMusic();
    this.scene.stop(SCENES.hud);
    this.scene.stop(this.data_.target);
    this.scene.start(this.data_.target, this.data_.restartData);
  }

  private quit(): void {
    audio.stopMusic();
    this.scene.stop(SCENES.hud);
    this.scene.stop(this.data_.target);
    this.scene.start(SCENES.title);
  }
}
