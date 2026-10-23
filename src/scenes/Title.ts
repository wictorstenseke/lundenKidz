import Phaser from "phaser";
import { audio } from "../audio/audio";
import { CHARACTERS } from "../characters";
import { SCENES } from "../config";
import { Controls } from "../input/controls";
import { LEVELS } from "../levels/levels";
import { session } from "../session";
import { handleGlobalKeys, Menu, text, unlockAudioOnInput } from "../ui";

export class Title extends Phaser.Scene {
  private controls!: Controls;
  private menu!: Menu;

  constructor() {
    super(SCENES.title);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x7ff0a5);
    this.add.tileSprite(0, height - 216, width / 3, 72, "backdrop-grass").setOrigin(0).setScale(3).setScrollFactor(0);

    text(this, width / 2, 70, "lundenKidz", 48, "#ffe066");

    CHARACTERS.forEach((c, i) => {
      const head = this.add.image(width / 2 + (i - 1) * 120, 175, `head-${c.id}`);
      this.tweens.add({ targets: head, y: 160, duration: 400, yoyo: true, repeat: -1, delay: i * 140, ease: "Sine.inOut" });
    });

    const unlocked = session.progress.unlockedLevels;
    this.menu = new Menu(
      this,
      width / 2,
      255,
      [
        ...LEVELS.map((level, i) => ({
          label: `${i + 1}. ${level.name}`,
          enabled: i < unlocked,
          onSelect: () => this.scene.start(SCENES.select, { levelIndex: i }),
        })),
        {
          label: `MTB Trail${session.highscores[0] ? ` (best ${session.highscores[0].score})` : ""}`,
          onSelect: () => this.scene.start(SCENES.select, { runner: true }),
        },
      ],
      34,
      Math.min(unlocked, LEVELS.length) - 1,
    );

    text(this, width / 2, height - 60, `Diamonds: ${session.progress.diamonds}`, 12, "#9ad8ff");
    text(this, width / 2, height - 30, "Arrows/WASD move  Space/Z jump  Esc pause  M mute  (gamepad works too)", 10);

    this.controls = new Controls(this);
    unlockAudioOnInput(this);
    audio.playMusic("title");
  }

  update(): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    this.menu.update(this.controls);
  }
}
