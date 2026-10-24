import Phaser from "phaser";
import { audio } from "../audio/audio";
import { CHARACTERS, wearOutfit, wearPreviousOutfit } from "../characters";
import { SCENES } from "../config";
import { Controls } from "../input/controls";
import { LEVELS } from "../levels/levels";
import { levelLabel, worldOf } from "../levels/worlds";
import { randomOutfit, type Outfit } from "../logic/outfits";
import { ANIM, bodyTexture, FRAME_SIZE, headAnchor, makeBike, makeBody, ORIGIN } from "../objects/sprites";
import { handleGlobalKeys, text, unlockAudioOnInput } from "../ui";
import type { TitleData } from "./Title";

/** Either a Level to play, or `runner` for MTB Trail. */
export type SelectData = { levelIndex: number } | { runner: true };

/** Remembers the last pick so the cursor starts there next time. */
let lastPick = 0;

export class CharacterSelect extends Phaser.Scene {
  private controls!: Controls;
  private target!: SelectData;
  private cursor!: Phaser.GameObjects.Rectangle;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super(SCENES.select);
  }

  init(data: SelectData): void {
    this.target = data;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x2a2440);
    const heading = "runner" in this.target ? "MTB Trail" : `Level ${levelLabel(this.target.levelIndex)}: ${LEVELS[this.target.levelIndex].name}`;
    text(this, width / 2, 50, heading, 20, "#ffe066");
    text(this, width / 2, 100, "Who's playing?", 16);

    this.cursor = this.add.rectangle(0, 0, 220, 300).setStrokeStyle(6, 0xffe066).setFillStyle(0xffffff, 0.08);
    this.cards = CHARACTERS.map((c, i) => {
      const x = width / 2 + (i - 1) * 260;
      const body = this.add.sprite(0, 110, bodyTexture(c.id), 0).setOrigin(ORIGIN.x / FRAME_SIZE, ORIGIN.y / FRAME_SIZE).setScale(4);
      const anchor = headAnchor(c.sprite, 0);
      const head = this.add.image((anchor.x - ORIGIN.x) * 4, 110 + (anchor.y - ORIGIN.y) * 4, `head-${c.id}`).setScale(0.95);
      const name = text(this, 0, 135, c.name, 16);
      const card = this.add.container(x, height / 2 + 20, [body, head, name]);
      card.setSize(220, 300).setInteractive().on("pointerdown", () => this.pick(i, true));
      this.tweens.add({ targets: head, y: head.y - 6, duration: 350, yoyo: true, repeat: -1, delay: i * 120 });
      return card;
    });

    const button = text(this, width / 2, height - 95, "[ New clothes ]", 14, "#ffe066")
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.newClothes())
      .on("pointerover", () => button.setColor("#ffffff"))
      .on("pointerout", () => button.setColor("#ffe066"));
    text(this, width / 2, height - 40, "Left/Right choose   Down new clothes   Up previous   Enter start   Esc back", 10);
    this.controls = new Controls(this);
    unlockAudioOnInput(this);
    this.pick(lastPick, false);
  }

  update(): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    if (this.controls.pressed("left")) this.pick((lastPick + CHARACTERS.length - 1) % CHARACTERS.length, false);
    if (this.controls.pressed("right")) this.pick((lastPick + 1) % CHARACTERS.length, false);
    if (this.controls.pressed("down")) this.newClothes();
    if (this.controls.pressed("up")) this.previousClothes();
    if (this.controls.pressed("confirm")) this.start();
    if (this.controls.pressed("back")) this.scene.start(SCENES.title, this.backTo());
  }

  private pick(i: number, andStart: boolean): void {
    if (i !== lastPick) audio.sfx("move");
    lastPick = i;
    const card = this.cards[i];
    this.cursor.setPosition(card.x, card.y + 10);
    this.cards.forEach((c, j) => this.pose(c.getAt(0) as Phaser.GameObjects.Sprite, CHARACTERS[j].id, j === i));
    if (andStart) this.start();
  }

  /** Dresses the highlighted Character in a random outfit; it stays on for the rest of the session. */
  private newClothes(): void {
    const c = CHARACTERS[lastPick];
    const outfit = randomOutfit();
    wearOutfit(c.id, outfit);
    this.dress(c.id, outfit);
    audio.sfx("move");
  }

  /** Back to the outfit worn before the last change (Up undoes Down). */
  private previousClothes(): void {
    const c = CHARACTERS[lastPick];
    const outfit = wearPreviousOutfit(c.id);
    if (!outfit) {
      audio.sfx("hurt");
      return;
    }
    this.dress(c.id, outfit);
    audio.sfx("move");
  }

  /** Repaints the Character's sheets; the card's sprite keeps idling on them and shows the new clothes. */
  private dress(id: string, outfit: Outfit): void {
    const c = CHARACTERS[lastPick];
    makeBody(this, id, c.sprite, outfit);
    makeBike(this, id, c.sprite, outfit);
  }

  /** The highlighted Character idles (its head stays put frame to frame); the others stand still. */
  private pose(body: Phaser.GameObjects.Sprite, id: string, selected: boolean): void {
    if (selected) {
      body.anims.play(ANIM.idle(id), true);
    } else {
      body.anims.stop();
      body.setFrame(0);
    }
  }

  /** Esc returns to the World this Level sits in, or the World list for MTB Trail. */
  private backTo(): TitleData {
    return "runner" in this.target ? {} : { world: worldOf(this.target.levelIndex) };
  }

  private start(): void {
    audio.sfx("select");
    const characterId = CHARACTERS[lastPick].id;
    if ("runner" in this.target) this.scene.start(SCENES.runner, { characterId });
    else this.scene.start(SCENES.game, { levelIndex: this.target.levelIndex, characterId });
  }
}
