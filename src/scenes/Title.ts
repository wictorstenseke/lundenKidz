import Phaser from "phaser";
import { audio } from "../audio/audio";
import { CHARACTERS } from "../characters";
import { SCENES } from "../config";
import { Controls } from "../input/controls";
import { hasTouchControls } from "../input/touch";
import { LEVELS } from "../levels/levels";
import { levelLabel, levelsInWorld, unlockedWorlds, worldOf, WORLDS } from "../levels/worlds";
import { session } from "../session";
import { handleGlobalKeys, Menu, text, unlockAudioOnInput } from "../ui";

/** Open on one World's Level list instead of the World list. */
export interface TitleData {
  world?: number;
}

export class Title extends Phaser.Scene {
  private controls!: Controls;
  private menu!: Menu;
  private world?: number;

  constructor() {
    super(SCENES.title);
  }

  init(data: TitleData): void {
    this.world = data?.world;
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

    this.menu = this.world === undefined ? this.worldMenu() : this.levelMenu(this.world);

    text(this, width / 2, height - 60, `Diamonds: ${session.progress.diamonds}`, 12, "#9ad8ff");
    if (!hasTouchControls()) {
      text(this, width / 2, height - 30, "Arrows move  S sprint  D/Space jump  Esc pause  M mute  (gamepad works too)", 10);
    }

    this.controls = new Controls(this);
    unlockAudioOnInput(this);
    audio.playMusic("title");
  }

  /** Top level: one entry per World, then MTB Trail. */
  private worldMenu(): Menu {
    const { width } = this.scale;
    const unlocked = session.progress.unlockedLevels;
    const open = unlockedWorlds(unlocked);
    return new Menu(
      this,
      width / 2,
      265,
      [
        ...WORLDS.map((world, i) => ({
          label: `World ${world.letter}: ${world.name}`,
          enabled: i < open,
          onSelect: () => this.scene.restart({ world: i } satisfies TitleData),
        })),
        {
          label: `MTB Trail${session.highscores[0] ? ` (best ${session.highscores[0].score})` : ""}`,
          onSelect: () => this.scene.start(SCENES.select, { runner: true }),
        },
      ],
      40,
      Math.min(open, WORLDS.length) - 1,
    );
  }

  /** One World's five Levels, then Back. */
  private levelMenu(world: number): Menu {
    const { width } = this.scale;
    const unlocked = session.progress.unlockedLevels;
    const indices = levelsInWorld(world);
    text(this, width / 2, 232, `World ${WORLDS[world].letter}: ${WORLDS[world].name}`, 14, "#9ad8ff");
    // Cursor on the furthest Level the player can play in this World.
    const furthest = Math.max(0, Math.min(unlocked - 1, indices[indices.length - 1]));
    const initial = worldOf(furthest) === world ? furthest - indices[0] : 0;
    return new Menu(
      this,
      width / 2,
      270,
      [
        ...indices.map((i) => ({
          label: `${levelLabel(i)}  ${LEVELS[i].name}`,
          enabled: i < unlocked,
          onSelect: () => this.scene.start(SCENES.select, { levelIndex: i }),
        })),
        { label: "Back", onSelect: () => this.scene.restart({} satisfies TitleData) },
      ],
      34,
      initial,
    );
  }

  update(): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    this.menu.update(this.controls);
    if (this.world !== undefined && this.controls.pressed("back")) {
      audio.sfx("move");
      this.scene.restart({} satisfies TitleData);
    }
  }
}
