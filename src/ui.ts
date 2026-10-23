import Phaser from "phaser";
import { audio } from "./audio/audio";
import { FONT } from "./config";
import type { Controls } from "./input/controls";

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 16,
  color = "#ffffff",
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, value, {
      fontFamily: `${FONT}, monospace`,
      fontSize: `${size}px`,
      color,
      stroke: "#1d1b2a",
      strokeThickness: Math.max(4, size / 4),
      align: "center",
    })
    .setOrigin(0.5);
}

/** Global keys every scene honours: M mutes, and any input unlocks audio. */
export function handleGlobalKeys(controls: Controls): void {
  if (controls.pressed("mute")) audio.toggleMute();
}

export function unlockAudioOnInput(scene: Phaser.Scene): void {
  const unlock = () => audio.unlock();
  scene.input.keyboard?.on("keydown", unlock);
  scene.input.on("pointerdown", unlock);
  scene.input.gamepad?.on("down", unlock);
}

export interface MenuItem {
  label: string;
  enabled?: boolean;
  onSelect: () => void;
}

/** Vertical list navigated with up/down and confirm. */
export class Menu {
  private index = 0;
  private texts: Phaser.GameObjects.Text[];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly items: MenuItem[],
    spacing = 36,
    initial = 0,
  ) {
    this.texts = items.map((item, i) => text(scene, x, y + i * spacing, item.label, 16));
    this.index = initial;
    this.texts.forEach((t, i) => t.setInteractive().on("pointerdown", () => {
      this.index = i;
      this.choose();
    }));
    this.render();
  }

  update(controls: Controls): void {
    if (controls.pressed("up")) this.move(-1);
    if (controls.pressed("down")) this.move(1);
    if (controls.pressed("confirm")) this.choose();
  }

  private move(delta: number): void {
    this.index = (this.index + delta + this.items.length) % this.items.length;
    audio.sfx("move");
    this.render();
  }

  private choose(): void {
    const item = this.items[this.index];
    if (item.enabled === false) {
      audio.sfx("hurt");
      return;
    }
    audio.sfx("select");
    item.onSelect();
  }

  private render(): void {
    this.texts.forEach((t, i) => {
      const item = this.items[i];
      const selected = i === this.index;
      t.setText(`${selected ? "> " : "  "}${item.label}${selected ? " <" : "  "}`);
      t.setColor(item.enabled === false ? "#777777" : selected ? "#ffe066" : "#ffffff");
    });
  }
}
