import Phaser from "phaser";
import { DIAMOND_TEXTURE } from "../objects/Diamond";
import { SCENES } from "../config";
import { Controls } from "../input/controls";
import { LEVELS } from "../levels/levels";
import { session } from "../session";
import { handleGlobalKeys, Menu, text } from "../ui";

export interface CompleteData {
  levelIndex: number;
  characterId: string;
  diamonds: number;
  totalDiamonds: number;
}

export class LevelComplete extends Phaser.Scene {
  private controls!: Controls;
  private menu!: Menu;

  constructor() {
    super(SCENES.complete);
  }

  create(data: CompleteData): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x2a2440);
    const last = data.levelIndex === LEVELS.length - 1;

    text(this, width / 2, 70, "Level complete!", 32, "#ffe066");
    text(this, width / 2, 120, LEVELS[data.levelIndex].name, 16);
    const head = this.add.image(width / 2, 210, `head-${data.characterId}`);
    this.tweens.add({ targets: head, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: -1 });

    this.add.image(width / 2 - 110, 300, DIAMOND_TEXTURE).setScale(3);
    text(this, width / 2 + 20, 302, `${data.diamonds} / ${data.totalDiamonds}`, 20, "#9ad8ff");
    text(this, width / 2, 345, `Total diamonds: ${session.progress.diamonds}`, 12, "#9ad8ff");

    this.menu = new Menu(this, width / 2, height - 120, [
      last
        ? { label: "Continue", onSelect: () => this.scene.start(SCENES.victory) }
        : { label: "Next level", onSelect: () => this.scene.start(SCENES.select, { levelIndex: data.levelIndex + 1 }) },
      { label: "Title screen", onSelect: () => this.scene.start(SCENES.title) },
    ]);
    this.controls = new Controls(this);
  }

  update(): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    this.menu.update(this.controls);
  }
}
