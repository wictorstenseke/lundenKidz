import Phaser from "phaser";
import { audio } from "../audio/audio";
import { SCENES } from "../config";
import { Controls } from "../input/controls";
import { session } from "../session";
import { handleGlobalKeys, Menu, text } from "../ui";

export interface RunnerOverData {
  score: number;
  /** 0-based place in the top-5, if it made it. */
  rank?: number;
  characterId: string;
}

export class RunnerOver extends Phaser.Scene {
  private controls!: Controls;
  private menu!: Menu;

  constructor() {
    super(SCENES.runnerOver);
  }

  create(data: RunnerOverData): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x2a2440);
    const best = data.rank === 0;
    text(this, width / 2, 60, best ? "New highscore!" : "Game over", 32, "#ffe066");
    text(this, width / 2, 115, `Score ${data.score}`, 24);
    if (best) audio.sfx("goal");

    text(this, width / 2, 175, "Top 5", 16, "#9ad8ff");
    session.highscores.forEach((entry, i) => {
      const y = 220 + i * 52;
      const mine = i === data.rank;
      if (mine) this.add.rectangle(width / 2, y, 420, 46, 0xffe066, 0.18).setStrokeStyle(3, 0xffe066);
      text(this, width / 2 - 160, y, `${i + 1}.`, 16, mine ? "#ffe066" : "#ffffff");
      this.add.image(width / 2 - 90, y, `head-${entry.characterId}`).setScale(0.5);
      text(this, width / 2 + 90, y, String(entry.score), 20, mine ? "#ffe066" : "#ffffff").setOrigin(1, 0.5);
      text(this, width / 2 + 150, y, entry.date.slice(5), 10, "#9aa0b8");
    });

    this.menu = new Menu(this, width / 2, height - 110, [
      { label: "Run again", onSelect: () => this.scene.start(SCENES.runner, { characterId: data.characterId }) },
      { label: "Change kid", onSelect: () => this.scene.start(SCENES.select, { runner: true }) },
      { label: "Title screen", onSelect: () => this.scene.start(SCENES.title) },
    ], 32);
    this.controls = new Controls(this);
  }

  update(): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    this.menu.update(this.controls);
  }
}
