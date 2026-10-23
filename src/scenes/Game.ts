import Phaser from "phaser";
import { audio } from "../audio/audio";
import { PHYSICS, SCENES, TILE, ZOOM } from "../config";
import { Controls } from "../input/controls";
import { LEVELS } from "../levels/levels";
import { parseLevel, type Cell, type ParsedLevel } from "../levels/parse";
import { parseTiledLevel, type TiledMap } from "../levels/tiled";
import { THEMES, type Theme } from "../levels/themes";
import { tileFrame } from "../levels/tiles";
import { landedOn, resolveContact } from "../logic/contact";
import { collectDiamond } from "../logic/diamonds";
import { FX } from "../fx/flags";
import { applyCameraFx } from "../fx/filters";
import { addLantern, enableLights, litIfEnabled } from "../fx/lights";
import { ambientLeaves, itemSparkle, landingDust } from "../fx/particles";
import { createParallax, type ParallaxHandle } from "../fx/parallax";
import { attachDiamondBling, burstDiamond, DIAMOND_TEXTURE } from "../objects/Diamond";
import { Enemy } from "../objects/Enemy";
import { Player } from "../objects/Player";
import { addDiamond, markLevelComplete, session } from "../session";
import { levelJsonKey, TILE_MARGIN, TILE_SPACING } from "./Boot";
import type { PauseData } from "./Pause";
import { handleGlobalKeys } from "../ui";

export interface GameData {
  levelIndex: number;
  characterId: string;
  /** Set when restarting after losing all Hearts. */
  checkpoint?: Cell;
  /** Diamond ids already collected this run; they stay collected after a restart. */
  collected?: string[];
}

export interface HudState {
  hearts: number;
  maxHearts: number;
  diamonds: number;
  characterId: string;
  levelName: string;
  /** MTB Trail only. */
  score?: number;
}

type Phase = "playing" | "dying" | "won";

const FRAME = { heart: 44, flag: [111, 112], pole: 131, spring: [107, 108], fence: 106, sign: 85 };
/** Drifting particles per theme: leaves in the meadow, snowflakes on the hills. */
const AMBIENT: Partial<Record<Theme["id"], Parameters<typeof ambientLeaves>[1]>> = {
  grass: { color: 0x6f9a3a },
  snow: { color: 0xffffff, accent: 0xdff6f5 },
};

export class Game extends Phaser.Scene {
  private data_!: GameData;
  private level!: ParsedLevel;
  private theme!: Theme;
  private controls!: Controls;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private collected = new Set<string>();
  private checkpoint?: Cell;
  private checkpointFlags: { cell: Cell; flag: Phaser.GameObjects.Sprite }[] = [];
  private lastSafe = { x: 0, y: 0 };
  private phase: Phase = "playing";
  private parallax!: ParallaxHandle;
  /** Light2D is on for this Level (FX.lights flag and WebGL). */
  private lit = false;
  private wasGrounded = true;
  /** Downward speed on the last airborne frame, for landing dust. */
  private prevVy = 0;

  constructor() {
    super(SCENES.game);
  }

  init(data: GameData): void {
    this.data_ = data;
    this.collected = new Set(data.collected ?? []);
    this.checkpoint = data.checkpoint;
    this.checkpointFlags = [];
    this.phase = "playing";
  }

  create(): void {
    const def = LEVELS[this.data_.levelIndex];
    const tiled = def.tiled ? (this.cache.json.get(levelJsonKey(this.data_.levelIndex)) as TiledMap | undefined) : undefined;
    this.level = tiled ? parseTiledLevel(tiled) : parseLevel(def.rows);
    this.theme = THEMES[def.theme];
    const worldW = this.level.width * TILE;
    const worldH = this.level.height * TILE;

    this.physics.world.gravity.y = PHYSICS.gravity;
    this.physics.world.setBounds(0, 0, worldW, worldH + 200, true, true, false, false);
    this.lit = enableLights(this, FX.lights, this.theme.ambient);
    this.createBackdrop(worldW, worldH);
    const layer = litIfEnabled(this.createTerrain(), this.lit);
    this.createDecor();

    const diamonds = this.physics.add.staticGroup();
    for (const d of this.level.diamonds) {
      if (this.collected.has(d.id)) continue;
      const img = diamonds.create(cx(d), d.y * TILE + TILE / 2, DIAMOND_TEXTURE) as Phaser.Physics.Arcade.Image;
      img.setData("id", d.id);
      img.body!.setSize(10, 10);
      attachDiamondBling(this, img, d.x * 40);
    }

    const hearts = this.physics.add.staticGroup();
    for (const h of this.level.heartPickups) {
      const img = hearts.create(cx(h), h.y * TILE + TILE / 2, "tiles", FRAME.heart) as Phaser.Physics.Arcade.Image;
      this.tweens.add({ targets: img, y: img.y - 2, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    const checkpoints = this.physics.add.staticGroup();
    for (const c of this.level.checkpoints) {
      // The flag frame carries its own pole segment, so it sits straight on the grid.
      const flag = this.add.sprite(cx(c), c.y * TILE + TILE / 2, "tiles", FRAME.flag[0]).setDepth(1);
      const active = this.checkpoint?.x === c.x && this.checkpoint?.y === c.y;
      this.setFlagActive(flag, active);
      this.checkpointFlags.push({ cell: c, flag });
      const zone = checkpoints.create(cx(c), c.y * TILE + TILE / 2, "tiles", FRAME.pole) as Phaser.Physics.Arcade.Image;
      zone.setVisible(false).setData("cell", c);
    }

    const springs = this.physics.add.staticGroup();
    for (const j of this.level.springs) {
      const img = springs.create(cx(j), j.y * TILE + TILE / 2, "tiles", FRAME.spring[0]) as Phaser.Physics.Arcade.Image;
      img.setDepth(2);
      // Only the pad on top bounces.
      img.body!.setSize(14, 8).setOffset(2, 10);
    }

    const goal = this.createGoal(this.level.goal);

    this.enemies = this.physics.add.group();
    const isSolid = (wx: number, wy: number) => this.isSolid(Math.floor(wx / TILE), Math.floor(wy / TILE));
    const springCells = new Set(this.level.springs.map((j) => `${j.x},${j.y}`));
    const isSpring = (wx: number, wy: number) => springCells.has(`${Math.floor(wx / TILE)},${Math.floor(wy / TILE)}`);
    for (const e of this.level.enemies) {
      this.enemies.add(litIfEnabled(new Enemy(this, cx(e), (e.y + 1) * TILE, e.kind, isSolid, isSpring), this.lit));
    }

    const spawn = this.checkpoint ?? this.level.start;
    this.player = new Player(this, cx(spawn), (spawn.y + 1) * TILE, this.data_.characterId).setLit(this.lit);
    for (const l of this.level.lanterns) {
      addLantern(this, cx(l), (l.y + 1) * TILE, { kind: l.kind, enabled: this.lit, halo: FX.glow });
    }
    this.lastSafe = { x: this.player.x, y: this.player.y };

    this.physics.add.collider(this.player, layer);
    this.physics.add.collider(this.enemies, layer);
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.touchEnemy(e as Enemy));
    this.physics.add.overlap(this.player, diamonds, (_p, d) => this.takeDiamond(d as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.player, hearts, (_p, h) => this.takeHeart(h as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.player, checkpoints, (_p, c) => this.reachCheckpoint((c as Phaser.GameObjects.Image).getData("cell")));
    this.physics.add.overlap(this.player, goal, () => this.win());
    this.physics.add.overlap(this.player, springs, (_p, j) => this.bounceOnSpring(j as Phaser.Physics.Arcade.Image));

    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setBounds(0, 0, worldW, worldH).setBackgroundColor(this.theme.sky);
    cam.startFollow(this.player, false, 0.12, 0.12, 0, 20);
    cam.setDeadzone(24, 40);
    applyCameraFx(cam);
    const drift = AMBIENT[this.theme.id];
    if (drift) ambientLeaves(this, drift);

    this.controls = new Controls(this);
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.controls.reset());
    if (!this.scene.isActive(SCENES.hud)) this.scene.launch(SCENES.hud);
    audio.playMusic(this.theme.music);
    this.emitHud();
  }

  update(time: number, delta: number): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    this.parallax.update();
    if (this.phase !== "playing") return;

    if (this.controls.pressed("pause")) {
      audio.sfx("pause");
      this.scene.pause();
      this.scene.launch(SCENES.pause, { target: SCENES.game, restartData: { levelIndex: this.data_.levelIndex, characterId: this.data_.characterId } } satisfies PauseData);
      return;
    }

    this.player.control(this.controls, time, delta / 1000, this.theme.traction);
    this.trackLanding();
    this.fadeSky();
    this.trackSafeGround();
    if (this.player.body.top > this.level.height * TILE + 8) this.fallIntoPit();
  }

  // --- Level building ---------------------------------------------------

  private createBackdrop(worldW: number, worldH: number): void {
    // Sky, far hills and near hills drift at different speeds; the strips follow the camera each update().
    this.parallax = createParallax(this, this.theme, worldW, worldH);

    if (!this.theme.clouds) return;
    // Scattered over the area the camera can see at this parallax, seeded per Level so they don't jump on restart.
    const rnd = new Phaser.Math.RandomDataGenerator([String(this.data_.levelIndex)]);
    const cloudParallax = 0.2;
    const count = Math.ceil((worldW * worldH) / 9000);
    for (let i = 0; i < count; i++) {
      const x = rnd.between(-400, worldW * cloudParallax + 600);
      const y = rnd.between(-300, worldH - 120);
      this.add
        .image(x, y, "bg-cloud")
        .setScrollFactor(cloudParallax, 1)
        .setDepth(-12.5)
        .setAlpha(rnd.realInRange(0.3, 0.55))
        .setScale(rnd.pick([1, 1, 2]));
    }
  }

  /** Dust when the Player touches down after a fall. */
  private trackLanding(): void {
    const grounded = this.player.grounded;
    if (grounded && !this.wasGrounded && this.prevVy > 120) {
      landingDust(this, this.player.x, this.player.body.bottom, this.prevVy / 400);
    }
    this.wasGrounded = grounded;
    if (!grounded) this.prevVy = this.player.body.velocity.y;
  }

  /** In tall Levels the sky darkens as the camera climbs. */
  private fadeSky(): void {
    const top = this.theme.skyTop;
    if (top === undefined) return;
    const cam = this.cameras.main;
    const range = this.level.height * TILE - cam.height / cam.zoom;
    const t = range > 0 ? 1 - Phaser.Math.Clamp(cam.worldView.y / range, 0, 1) : 0;
    const from = Phaser.Display.Color.IntegerToColor(this.theme.sky);
    const to = Phaser.Display.Color.IntegerToColor(top);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, t * 100);
    cam.setBackgroundColor(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
  }

  private createTerrain(): Phaser.Tilemaps.TilemapLayer {
    const { terrain, width, height } = this.level;
    const data: number[][] = [];
    for (let y = 0; y < height; y++) {
      data.push([]);
      for (let x = 0; x < width; x++) data[y].push(tileFrame(terrain, x, y, this.theme));
    }
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage("tiles", "tiles-extruded", TILE, TILE, TILE_MARGIN, TILE_SPACING)!;
    // v4 can also return a TilemapGPULayer; we ask for the classic layer so per-tile collision/tint keep working.
    const layer = map.createLayer(0, tileset, 0, 0, false) as Phaser.Tilemaps.TilemapLayer;
    layer.forEachTile((tile) => {
      const t = terrain[tile.y][tile.x];
      if (t === "ground" || t === "block") tile.setCollision(true, true, true, true);
      else if (t === "platform" || t === "cloud") tile.setCollision(false, false, true, false);
      if (tile.index >= 0) tile.tint = this.theme.tint;
    });
    return layer;
  }

  private createDecor(): void {
    for (const d of this.level.decor) {
      const frame = d.kind === "fence" ? FRAME.fence : d.kind === "sign" ? FRAME.sign : this.theme.decor[d.x % this.theme.decor.length];
      litIfEnabled(this.add.image(cx(d), d.y * TILE + TILE / 2, "tiles", frame).setDepth(0), this.lit);
    }
  }

  private createGoal(g: Cell): Phaser.Physics.Arcade.Image {
    // Two pole tiles with the flag tile (which has its own pole segment) on top, all on the grid.
    for (let i = 0; i < 2; i++) this.add.image(cx(g), (g.y - i) * TILE + TILE / 2, "tiles", FRAME.pole).setDepth(1);
    const flag = this.add.sprite(cx(g), (g.y - 2) * TILE + TILE / 2, "tiles", FRAME.flag[0]).setDepth(1).setTint(0xffe066);
    if (!this.anims.exists("flag-wave")) {
      this.anims.create({ key: "flag-wave", frames: this.anims.generateFrameNumbers("tiles", { frames: FRAME.flag }), frameRate: 4, repeat: -1 });
    }
    flag.play("flag-wave");
    const zone = this.physics.add.staticImage(cx(g), (g.y - 1) * TILE + TILE / 2, "tiles", FRAME.pole).setVisible(false);
    zone.body.setSize(10, TILE * 3);
    return zone;
  }

  private setFlagActive(flag: Phaser.GameObjects.Sprite, active: boolean): void {
    if (active) {
      flag.clearTint();
      flag.play("flag-wave", true);
    } else {
      flag.setTint(0x666677);
      flag.anims.stop();
    }
  }

  private isSolid(tx: number, ty: number): boolean {
    const t = this.level.terrain[ty]?.[tx];
    return t !== undefined && t !== "empty";
  }

  // --- Gameplay ----------------------------------------------------------

  private touchEnemy(enemy: Enemy): void {
    if (enemy.dead || this.phase !== "playing") return;
    const body = this.player.body;
    const outcome = resolveContact({
      playerPrevBottom: body.prev.y + body.height,
      playerVelocityY: body.velocity.y,
      enemyTop: enemy.body.top,
      stompable: enemy.stompable,
    });
    if (outcome === "stomp") {
      enemy.squash();
      this.player.bounce(this.controls.held("jump"));
      audio.sfx("stomp");
      this.cameras.main.shake(40, 0.0012);
    } else {
      enemy.turnAround(this.player.x);
      this.hurt(enemy.x);
    }
  }

  private bounceOnSpring(spring: Phaser.Physics.Arcade.Image): void {
    const body = this.player.body;
    if (!landedOn(body.prev.y + body.height, body.velocity.y, spring.body!.top)) return;
    this.player.launch();
    audio.sfx("spring");
    spring.setFrame(FRAME.spring[1]);
    this.time.delayedCall(250, () => spring.setFrame(FRAME.spring[0]));
  }

  private hurt(fromX: number): void {
    const result = this.player.health.hit(this.time.now);
    if (result === "ignored") return;
    if (result === "dead") return this.die();
    audio.sfx("hurt");
    this.player.knockback(fromX, this.time.now);
    this.emitHud();
  }

  private fallIntoPit(): void {
    const result = this.player.health.hit(this.time.now);
    if (result === "dead") return this.die();
    if (result === "hurt") audio.sfx("hurt");
    this.player.respawnAt(this.lastSafe.x, this.lastSafe.y);
    this.emitHud();
  }

  /** Remembers the centre of the solid tile under the Player's feet, for pit respawns. */
  private trackSafeGround(): void {
    if (!this.player.grounded) return;
    const b = this.player.body;
    const ty = Math.floor((b.bottom + 1) / TILE);
    const candidates = [b.center.x, b.left, b.right].map((x) => Math.floor(x / TILE));
    const tx = candidates.find((x) => this.isSolid(x, ty) && !this.isSolid(x, ty - 1) && !this.isSolid(x, ty - 2));
    if (tx !== undefined) this.lastSafe = { x: tx * TILE + TILE / 2, y: ty * TILE };
  }

  private die(): void {
    this.phase = "dying";
    this.emitHud();
    audio.stopMusic();
    audio.sfx("death");
    this.player.anims.stop();
    this.player.setFrame(3).setAlpha(1);
    this.player.body.checkCollision.none = true;
    this.player.setVelocity(0, -320);
    this.player.setHeadTint(0xffaaaa);
    this.time.delayedCall(1400, () => {
      this.scene.restart({ ...this.data_, checkpoint: this.checkpoint, collected: [...this.collected] } satisfies GameData);
    });
  }

  private takeDiamond(img: Phaser.Physics.Arcade.Image): void {
    this.collected.add(img.getData("id"));
    burstDiamond(this, img.x, img.y, img.depth);
    img.destroy();
    const { total, heartEarned } = collectDiamond(session.progress.diamonds);
    addDiamond(total);
    audio.sfx("diamond");
    if (heartEarned && this.player.health.heal()) audio.sfx("heart");
    this.emitHud();
  }

  private takeHeart(img: Phaser.Physics.Arcade.Image): void {
    if (!this.player.health.heal()) return;
    itemSparkle(this, img.x, img.y, 0xff6080);
    img.destroy();
    audio.sfx("heart");
    this.emitHud();
  }

  private reachCheckpoint(cell: Cell): void {
    if (this.checkpoint?.x === cell.x && this.checkpoint?.y === cell.y) return;
    this.checkpoint = cell;
    audio.sfx("checkpoint");
    for (const { cell: c, flag } of this.checkpointFlags) this.setFlagActive(flag, c === cell);
  }

  private win(): void {
    if (this.phase !== "playing") return;
    this.phase = "won";
    audio.stopMusic();
    audio.sfx("goal");
    this.player.setVelocity(0, -200);
    this.player.anims.stop();
    this.player.setFrame(3);
    markLevelComplete(this.data_.levelIndex);
    this.time.delayedCall(1600, () => {
      this.scene.stop(SCENES.hud);
      this.scene.start(SCENES.complete, {
        levelIndex: this.data_.levelIndex,
        characterId: this.data_.characterId,
        diamonds: this.collected.size,
        totalDiamonds: this.level.diamonds.length,
      });
    });
  }

  private emitHud(): void {
    const state: HudState = {
      hearts: this.player.health.hearts,
      maxHearts: this.player.health.max,
      diamonds: session.progress.diamonds,
      characterId: this.data_.characterId,
      levelName: LEVELS[this.data_.levelIndex].name,
    };
    this.registry.set("hud", state);
  }
}

const cx = (c: Cell) => c.x * TILE + TILE / 2;
