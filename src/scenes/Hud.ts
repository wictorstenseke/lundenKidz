import Phaser from "phaser";
import { SCENES } from "../config";
import { text } from "../ui";
import type { HudState } from "./Game";

const SCALE = 3;

export class Hud extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private head?: Phaser.GameObjects.Image;
  private diamondText!: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private shownLevel?: string;

  constructor() {
    super(SCENES.hud);
  }

  create(): void {
    this.hearts = [];
    this.head = undefined;
    this.scoreText = undefined;
    this.shownLevel = undefined;
    const { width } = this.scale;
    this.add.image(width - 150, 32, "tiles", 67).setScale(SCALE);
    this.diamondText = text(this, width - 120, 34, "0", 20).setOrigin(0, 0.5);

    // Game publishes its state in the registry; it may have done so before this scene started.
    const onHud = (_parent: unknown, s: HudState) => this.render(s);
    this.registry.events.on("changedata-hud", onHud);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.registry.events.off("changedata-hud", onHud));
    const current = this.registry.get("hud") as HudState | undefined;
    if (current) this.render(current);
  }

  private render(s: HudState): void {
    if (!this.head) {
      this.head = this.add.image(36, 34, `head-${s.characterId}`).setScale(0.5);
    }
    while (this.hearts.length < s.maxHearts) {
      this.hearts.push(this.add.image(80 + this.hearts.length * 48, 34, "tiles", 44).setScale(SCALE));
    }
    this.hearts.forEach((h, i) => h.setFrame(i < s.hearts ? 44 : 46));
    this.diamondText.setText(String(s.diamonds));
    if (s.score !== undefined) {
      this.scoreText ??= text(this, this.scale.width / 2, 34, "", 20, "#ffe066");
      this.scoreText.setText(`Score ${s.score}`);
    }

    if (this.shownLevel !== s.levelName) {
      this.shownLevel = s.levelName;
      const banner = text(this, this.scale.width / 2, 110, s.levelName, 24, "#ffe066");
      this.tweens.add({ targets: banner, alpha: 0, delay: 1500, duration: 600, onComplete: () => banner.destroy() });
    }
  }
}
