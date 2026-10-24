import Phaser from "phaser";
import { audio } from "../audio/audio";
import { CHARACTERS } from "../characters";
import { SCENES } from "../config";
import { Controls } from "../input/controls";
import { session } from "../session";
import { handleGlobalKeys, text } from "../ui";

export class Victory extends Phaser.Scene {
  private controls!: Controls;

  constructor() {
    super(SCENES.victory);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x2a2440);
    text(this, width / 2, 90, "You did it!", 40, "#ffe066");
    text(this, width / 2, 150, "Every level in every world beaten", 16);
    CHARACTERS.forEach((c, i) => {
      const head = this.add.image(width / 2 + (i - 1) * 140, 280, `head-${c.id}`);
      this.tweens.add({ targets: head, y: 240, duration: 350, yoyo: true, repeat: -1, delay: i * 120, ease: "Quad.out" });
    });
    text(this, width / 2, 380, `Diamonds collected: ${session.progress.diamonds}`, 16, "#9ad8ff");
    text(this, width / 2, height - 50, "Press Enter", 12);
    this.controls = new Controls(this);
    audio.playMusic("title");
    audio.sfx("goal");
  }

  update(): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    if (this.controls.pressed("confirm")) this.scene.start(SCENES.title);
  }
}
