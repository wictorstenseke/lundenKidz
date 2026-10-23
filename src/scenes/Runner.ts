import Phaser from "phaser";
import { audio } from "../audio/audio";
import { FONT, PHYSICS, SCENES, TILE, ZOOM } from "../config";
import { Controls } from "../input/controls";
import type { EnemyKind } from "../levels/parse";
import { THEMES } from "../levels/themes";
import { resolveContact } from "../logic/contact";
import { collectDiamond } from "../logic/diamonds";
import { applyCameraFx } from "../fx/filters";
import { ambientLeaves, itemSparkle, landingDust } from "../fx/particles";
import { attachDiamondBling, burstDiamond, DIAMOND_TEXTURE } from "../objects/Diamond";
import { runScore } from "../logic/highscores";
import {
  airBonus,
  availablePatterns,
  FLIP_POINTS,
  FLIP_SPEED,
  flipName,
  gapRange,
  landing,
  levelOut,
  rampHeightAt,
  rampPop,
  rampRunOut,
  RAMPS,
  rampSlopeAt,
  rollOffDistance,
  rollOffSpeed,
  RUN,
  sagFor,
  speedAt,
  WHEELIE_ANGLE,
  wheelieBonus,
  type Pattern,
} from "../logic/runner";
import { Enemy } from "../objects/Enemy";
import { Player } from "../objects/Player";
import { addDiamond, recordRun, session } from "../session";
import { handleGlobalKeys } from "../ui";
import type { HudState } from "./Game";
import type { PauseData } from "./Pause";
import type { RunnerOverData } from "./RunnerOver";

export interface RunnerData {
  characterId: string;
}

const WORLD_H = 12 * TILE;
/** The line the wheels roll along. */
const FLOOR = 10 * TILE;
const START_X = 60;
/** How far ahead of the Player the camera looks. */
const LOOK_AHEAD = 110;
/** How far above the world the camera can rise to follow big jumps. */
const SKY_ABOVE = 200;
/** The camera centres this far below the rider, so it only rises when the rider is high up. */
const CAMERA_BELOW = 40;
/** Gaps are forgiving: the bike only drops once its centre is this far past an edge. */
const GAP_GRACE = 6;
const FRAME = { rock: 68, heart: 44 };
/** Dirt trail tiles: [single, left end, middle, right end]. */
const TRAIL_TOP = [60, 61, 62, 63];
const TRAIL_FILL = [120, 121, 122, 123];
const GAP_COLOR = 0x1f4a3a;
const theme = THEMES.grass;

interface Ramp {
  x0: number;
  x1: number;
  length: number;
  height: number;
  launch: number;
  parts: Phaser.GameObjects.GameObject[];
}

interface Gap {
  x0: number;
  x1: number;
  parts: Phaser.GameObjects.GameObject[];
}

/** MTB Trail on a mountain bike: rides on its own, faster and faster; only jump is used. */
export class Runner extends Phaser.Scene {
  private data_!: RunnerData;
  private controls!: Controls;
  private player!: Player;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private pickups!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private floorCollider!: Phaser.Physics.Arcade.Collider;
  private ground!: Phaser.GameObjects.TileSprite;
  private backdrop!: Phaser.GameObjects.TileSprite;
  private floorFill!: Phaser.GameObjects.Rectangle;
  private clouds: { img: Phaser.GameObjects.Image; offset: number; parallax: number }[] = [];
  private ramps: Ramp[] = [];
  private gaps: Gap[] = [];
  private onRamp?: Ramp;
  /** Set when jumping off a ramp; cleared on landing. */
  private airborneSince?: number;
  /** Set while a wheelie is held. */
  private wheelieSince?: number;
  /** True from leaving the ground (or a ramp) until touching down. */
  private inAir = false;
  /** Downward speed just before touching down, for how hard the suspension compresses. */
  private fallSpeed = 0;
  private sagTween?: Phaser.Tweens.Tween;
  private rnd = new Phaser.Math.RandomDataGenerator();
  private elapsed = 0;
  private nextSpawnX = 0;
  private diamonds = 0;
  private stomps = 0;
  private bonus = 0;
  private score = 0;
  private over = false;

  constructor() {
    super(SCENES.runner);
  }

  init(data: RunnerData): void {
    this.data_ = data;
    this.rnd = new Phaser.Math.RandomDataGenerator([String(Date.now())]);
    this.ramps = [];
    this.gaps = [];
    this.onRamp = undefined;
    this.airborneSince = undefined;
    this.wheelieSince = undefined;
    this.inAir = false;
    this.fallSpeed = 0;
    this.elapsed = 0;
    this.nextSpawnX = START_X + 320;
    this.diamonds = 0;
    this.stomps = 0;
    this.bonus = 0;
    this.score = 0;
    this.over = false;
  }

  create(): void {
    makeTrailTextures(this);
    const viewW = this.scale.width / ZOOM;
    this.physics.world.gravity.y = PHYSICS.gravity;

    // Background and ground are camera-wide strips that slide along under the camera.
    this.backdrop = this.add.tileSprite(0, WORLD_H - 100, viewW + 2, 72, `backdrop-${theme.id}`).setOrigin(0).setDepth(-10);
    this.floorFill = this.add.rectangle(0, WORLD_H - 28, viewW + 2, 40, theme.backdrop.floor).setOrigin(0).setDepth(-10);
    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      img: this.add.image(0, this.rnd.between(10, 100), "bg-cloud").setDepth(-11).setAlpha(this.rnd.realInRange(0.4, 0.7)).setScale(this.rnd.pick([1, 2])),
      offset: i * 90 + this.rnd.between(0, 60),
      parallax: this.rnd.realInRange(0.1, 0.3),
    }));
    this.ground = this.add.tileSprite(0, FLOOR, viewW + TILE * 2, TILE * 2, "trail-ground").setOrigin(0).setDepth(3);
    const floorBody = this.add.zone(-1000, FLOOR, 1e8, TILE * 2).setOrigin(0);
    this.physics.add.existing(floorBody, true);

    this.hazards = this.physics.add.staticGroup();
    this.pickups = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.player = new Player(this, START_X, FLOOR, this.data_.characterId, RUN.hearts, "bike");

    this.floorCollider = this.physics.add.collider(this.player, floorBody);
    this.physics.add.collider(this.enemies, floorBody);
    this.physics.add.overlap(this.player, this.hazards, () => this.hurt());
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.touchEnemy(e as Enemy));
    this.physics.add.overlap(this.player, this.pickups, (_p, item) => this.pickUp(item as Phaser.Physics.Arcade.Image));

    const cam = this.cameras.main;
    // The camera may rise above the world for big jumps; on the ground the bottom bound holds it still.
    cam.setZoom(ZOOM).setBounds(-1000, -SKY_ABOVE, 1e8, WORLD_H + SKY_ABOVE).setBackgroundColor(theme.sky);
    cam.startFollow(this.player, false, 1, 0.12, -LOOK_AHEAD, -CAMERA_BELOW);
    applyCameraFx(cam);
    ambientLeaves(this, { color: 0x6f9a3a });

    this.controls = new Controls(this);
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.controls.reset());
    if (!this.scene.isActive(SCENES.hud)) this.scene.launch(SCENES.hud);
    audio.playMusic("runner");
    this.emitHud();
  }

  update(time: number, delta: number): void {
    this.controls.update();
    handleGlobalKeys(this.controls);
    this.slideScenery();
    if (this.over) return;

    if (this.controls.pressed("pause")) {
      audio.sfx("pause");
      this.scene.pause();
      this.scene.launch(SCENES.pause, { target: SCENES.runner, restartData: { characterId: this.data_.characterId } } satisfies PauseData);
      return;
    }

    const dt = delta / 1000;
    this.elapsed += dt;
    const speed = speedAt(this.elapsed);
    this.player.control(this.controls, time, dt, 1, speed);
    this.player.anims.timeScale = speed / RUN.startSpeed;
    this.rideRamps(time);
    this.wheelie(time);
    this.tilt(dt);
    this.trackLanding(time);
    this.floorCollider.active = !this.gapAt(this.player.body.center.x, GAP_GRACE);
    if (this.player.y > WORLD_H + 30) this.fallIntoGap();

    const view = this.cameras.main.worldView;
    while (this.nextSpawnX < view.right + 80) {
      const width = this.spawn(this.nextSpawnX, speed);
      const [min, max] = gapRange(speed);
      this.nextSpawnX += width + this.rnd.between(min, max);
    }
    this.cleanUp(view.x - 80);

    const score = runScore({ distancePx: this.player.x - START_X, diamonds: this.diamonds, stomps: this.stomps, bonus: this.bonus });
    if (score !== this.score) {
      this.score = score;
      this.emitHud();
    }
  }

  private slideScenery(): void {
    const view = this.cameras.main.worldView;
    this.backdrop.setX(view.x - 1);
    this.backdrop.tilePositionX = view.x * 0.35;
    this.floorFill.setX(view.x - 1);
    // Clouds drift by slower than the ground and wrap around the view.
    const span = view.width + 120;
    for (const c of this.clouds) {
      c.img.setX(view.x - 60 + Phaser.Math.Wrap(c.offset - view.x * c.parallax, 0, span));
    }
    // Snap to whole tiles so the ground pattern stays fixed to the world.
    this.ground.setX(Math.floor(view.x / TILE) * TILE - TILE);
  }

  // --- Ramps, air and gaps -----------------------------------------------

  /**
   * Rolls the bike up a kicker's curve. Jumping on it pops the bike high (highest near the lip);
   * otherwise it rolls off the lip with a small natural kick.
   */
  private rideRamps(time: number): void {
    const p = this.player;
    const x = p.body.center.x;
    if (!this.onRamp) {
      const ramp = this.ramps.find((r) => x >= r.x0 && x < r.x0 + 10);
      if (!ramp || p.body.bottom < FLOOR - 2) return;
      this.onRamp = ramp;
      p.body.setAllowGravity(false);
    }
    const ramp = this.onRamp;
    const t = (x - ramp.x0) / ramp.length;
    if (this.controls.pressed("jump")) {
      p.body.setAllowGravity(true);
      p.launch(rampPop(ramp.launch, t));
      this.onRamp = undefined;
      this.airborneSince = time;
      audio.sfx("jump");
    } else if (t < 1) {
      // Follow the curve: climb at its current steepness, nudged onto the surface.
      const surface = FLOOR - rampHeightAt(ramp, t);
      const climb = p.body.velocity.x * rampSlopeAt(ramp, t);
      p.setVelocityY(-climb + (surface - p.body.bottom) * 20);
    } else {
      p.body.setAllowGravity(true);
      p.setVelocityY(-rollOffSpeed(ramp, p.body.velocity.x));
      this.onRamp = undefined;
    }
  }

  /** Holding back lifts the front wheel; the longer it's held, the more points on release. */
  private wheelie(time: number): void {
    const holding = this.controls.held("left") && this.player.grounded && !this.onRamp;
    if (holding) {
      this.wheelieSince ??= time;
      return;
    }
    if (this.wheelieSince === undefined) return;
    const points = wheelieBonus((time - this.wheelieSince) / 1000);
    this.wheelieSince = undefined;
    if (points === 0) return;
    this.bonus += points;
    this.popup(`Wheelie! +${points}`);
  }

  /**
   * On the ground the bike follows ramps and wheelies, pivoting on the rear wheel. In the air it
   * spins around its middle: back/forward flip while left/right is held, otherwise it levels out
   * so it lands flat.
   */
  private tilt(dt: number): void {
    const p = this.player;
    const airborne = !p.grounded && !this.onRamp;
    p.anchor = Phaser.Math.Linear(p.anchor, airborne ? 0 : 1, Math.min(1, dt * 10));
    if (airborne) {
      if (this.controls.held("left")) p.tilt -= FLIP_SPEED * dt;
      else if (this.controls.held("right")) p.tilt += FLIP_SPEED * dt;
      else p.tilt = levelOut(p.tilt, dt);
      return;
    }
    let target = 0;
    if (this.wheelieSince !== undefined) {
      target = -WHEELIE_ANGLE;
    } else if (this.onRamp) {
      const t = Phaser.Math.Clamp((p.body.center.x - this.onRamp.x0) / this.onRamp.length, 0, 1);
      target = -Phaser.Math.RadToDeg(Math.atan(rampSlopeAt(this.onRamp, t)));
    }
    p.tilt = Phaser.Math.Linear(p.tilt, target, Math.min(1, dt * 12));
  }

  /** Judges each touchdown: crash if badly tilted, otherwise score flips and big air. */
  private trackLanding(time: number): void {
    const p = this.player;
    if (!p.grounded) {
      if (!this.onRamp) {
        this.inAir = true;
        this.fallSpeed = Math.max(0, p.body.velocity.y);
      }
      return;
    }
    if (!this.inAir) return;
    this.inAir = false;
    this.compress(sagFor(this.fallSpeed));
    if (this.fallSpeed > 120) landingDust(this, p.x, p.body.bottom, this.fallSpeed / 400);
    const { crashed, flips } = landing(p.tilt);
    const air = this.airborneSince === undefined ? 0 : airBonus((time - this.airborneSince) / 1000);
    this.airborneSince = undefined;
    if (crashed) {
      p.tilt = 0;
      this.popup("Crash!");
      this.hurt();
      return;
    }
    // Keep the small leftover angle; the ground eases it flat.
    p.tilt -= Math.round(p.tilt / 360) * 360;
    const messages: string[] = [];
    if (flips !== 0) {
      const points = Math.abs(flips) * FLIP_POINTS;
      this.bonus += points;
      messages.push(`${flipName(flips)}! +${points}`);
    }
    if (air > 0) {
      this.bonus += air;
      messages.push(air >= 30 ? `Huge air! +${air}` : `Big air! +${air}`);
    }
    if (messages.length === 0) return;
    audio.sfx("checkpoint");
    this.popup(messages.join("\n"));
  }

  /** Squashes the suspension by `sag` px and lets it spring back. */
  private compress(sag: number): void {
    this.sagTween?.stop();
    this.sagTween = this.tweens.addCounter({
      from: sag,
      to: 0,
      duration: 120 + sag * 60,
      ease: "Quad.out",
      onUpdate: (tween) => (this.player.sag = Math.round(tween.getValue() ?? 0)),
      onComplete: () => (this.player.sag = 0),
    });
  }

  private gapAt(x: number, grace = 0): Gap | undefined {
    return this.gaps.find((g) => x > g.x0 + grace && x < g.x1 - grace);
  }

  private fallIntoGap(): void {
    const gap = this.gaps.filter((g) => g.x0 < this.player.x).pop();
    const result = this.player.health.hit(this.time.now);
    if (result === "dead") return this.gameOver();
    if (result === "hurt") audio.sfx("hurt");
    this.player.respawnAt((gap ? gap.x1 : this.player.x) + 14, FLOOR);
    this.player.tilt = 0;
    this.player.anchor = 1;
    this.inAir = false;
    this.airborneSince = undefined;
    this.emitHud();
  }

  // --- Spawning ----------------------------------------------------------

  /** Places one pattern starting at x and returns how wide it is. Spacing inside combos scales with speed. */
  private spawn(x: number, speed: number): number {
    const space = gapRange(speed)[0];
    const runOut = rampRunOut(speed);
    const hp = this.player.health;
    if (hp.hearts < hp.max && this.rnd.frac() < 0.1) {
      this.pickup(x, FLOOR - 40, "heart");
      return TILE;
    }
    const pattern: Pattern = this.rnd.pick(availablePatterns(this.elapsed));
    switch (pattern) {
      case "rock": return this.hazard(x, "rock");
      case "rocks":
        this.hazard(x, "rock");
        return this.hazard(x + TILE, "rock") + TILE;
      case "log": return this.hazard(x, "log");
      case "logPile": return this.hazard(x, "logPile");
      case "stump": return this.hazard(x, "stump");
      case "walker":
      case "hopper":
      case "spiky": return this.enemy(x, pattern);
      case "walkerPair":
        this.enemy(x, "walker");
        return this.enemy(x + 36, "walker") + 36;
      case "diamondArc":
        this.diamondArc(x, FLOOR - 20, 80, 36);
        return 80;
      case "rockUnderDiamonds":
        this.hazard(x + 36, "rock");
        this.diamondArc(x, FLOOR - 30, 80, 36);
        return 80;
      case "kicker": {
        const ramp = this.ramp(x, "small");
        this.diamondArc(ramp.x1 + 10, FLOOR - 40, 90, 30);
        return ramp.x1 - x + Math.max(100, runOut);
      }
      case "bigKicker": {
        const ramp = this.ramp(x, "big");
        this.diamondArc(ramp.x1 + 10, FLOOR - 60, 130, 40);
        return ramp.x1 - x + Math.max(140, runOut);
      }
      case "kickerGap": {
        const ramp = this.ramp(x, "small");
        const gap = this.gap(ramp.x1 + 12, 3);
        this.diamondArc(gap.x0, FLOOR - 40, gap.x1 - gap.x0, 24);
        return Math.max(gap.x1, ramp.x1 + runOut) - x;
      }
      case "gap": {
        const gap = this.gap(x, this.elapsed > 50 ? 3 : 2);
        return gap.x1 - x;
      }
      // Ramp with something right after the lip: pop to clear it, or roll into it.
      case "rampOverLog": {
        // Placed where rolling off the lip comes down at this speed, so only a pop clears it.
        const ramp = this.ramp(x, "small");
        const at = Math.max(20, rollOffDistance(RAMPS.small, speed, PHYSICS.gravity) - 17);
        this.hazard(ramp.x1 + at, "log");
        return ramp.x1 - x + Math.max(at + 34, runOut);
      }
      case "rampOverRocks": {
        const ramp = this.ramp(x, "big");
        for (let i = 0; i < 3; i++) this.hazard(ramp.x1 + 24 + i * TILE, "rock");
        this.diamondArc(ramp.x1 + 10, FLOOR - 70, 80, 30);
        return ramp.x1 - x + Math.max(24 + 3 * TILE, runOut);
      }
      // Two obstacles back to back, just far enough apart to land and jump again.
      case "rockThenLog":
        this.hazard(x, "rock");
        return space + this.hazard(x + space, "log");
      case "logThenWalker":
        // The walker comes toward the bike, so give it a little extra room.
        this.hazard(x, "log");
        return space + 40 + this.enemy(x + space + 40, "walker");
      case "gapThenRock": {
        const gap = this.gap(x, 2);
        return gap.x1 - x + space + this.hazard(gap.x1 + space, "rock");
      }
    }
  }

  private hazard(x: number, kind: keyof typeof HAZARDS): number {
    const spec = HAZARDS[kind];
    const img = this.hazards.create(x + spec.width / 2, FLOOR - spec.height / 2, spec.texture, spec.frame) as Phaser.Physics.Arcade.Image;
    img.setDepth(4);
    (img.body as Phaser.Physics.Arcade.StaticBody).setSize(spec.body[0], spec.body[1], false).setOffset(spec.body[2], spec.body[3]);
    return spec.width;
  }

  private enemy(x: number, kind: EnemyKind): number {
    // Enemies turn back at gap edges instead of riding into them.
    this.enemies.add(new Enemy(this, x + 12, FLOOR, kind, (wx) => !this.gapAt(wx), () => false));
    return 24;
  }

  private ramp(x: number, size: keyof typeof RAMPS): Ramp {
    const spec = RAMPS[size];
    const img = this.add.image(x, FLOOR, `ramp-${size}`).setOrigin(0, 1).setDepth(4);
    const ramp: Ramp = { x0: x, x1: x + spec.length, length: spec.length, height: spec.height, launch: spec.launch, parts: [img] };
    this.ramps.push(ramp);
    return ramp;
  }

  /** A hole in the trail `tiles` wide, starting on the next tile boundary. */
  private gap(x: number, tiles: number): Gap {
    const x0 = Math.ceil(x / TILE) * TILE;
    const x1 = x0 + tiles * TILE;
    const parts: Phaser.GameObjects.GameObject[] = [
      this.add.rectangle(x0, FLOOR, x1 - x0, WORLD_H - FLOOR + 40, GAP_COLOR).setOrigin(0).setDepth(4),
      // Lip tiles with rounded edges on either side of the hole.
      this.add.image(x0 - TILE, FLOOR, "tiles", TRAIL_TOP[3]).setOrigin(0).setDepth(4),
      this.add.image(x0 - TILE, FLOOR + TILE, "tiles", TRAIL_FILL[3]).setOrigin(0).setDepth(4),
      this.add.image(x1, FLOOR, "tiles", TRAIL_TOP[1]).setOrigin(0).setDepth(4),
      this.add.image(x1, FLOOR + TILE, "tiles", TRAIL_FILL[1]).setOrigin(0).setDepth(4),
    ];
    const gap = { x0, x1, parts };
    this.gaps.push(gap);
    return gap;
  }

  private diamondArc(x: number, baseY: number, width: number, lift: number): void {
    for (let i = 0; i < 5; i++) {
      const y = baseY - Math.sin((i / 4) * Math.PI) * lift;
      this.pickup(x + (i * width) / 4, y, "diamond");
    }
  }

  private pickup(x: number, y: number, kind: "diamond" | "heart"): void {
    const img = (
      kind === "diamond" ? this.pickups.create(x, y, DIAMOND_TEXTURE) : this.pickups.create(x, y, "tiles", FRAME.heart)
    ) as Phaser.Physics.Arcade.Image;
    img.setData("kind", kind).setDepth(5);
    (img.body as Phaser.Physics.Arcade.StaticBody).setSize(10, 10);
    if (kind === "diamond") attachDiamondBling(this, img);
  }

  private cleanUp(leftEdge: number): void {
    for (const group of [this.hazards, this.pickups, this.enemies]) {
      for (const child of [...group.getChildren()] as Phaser.GameObjects.Sprite[]) {
        if (child.x < leftEdge) child.destroy();
      }
    }
    const keep = <T extends { x1: number; parts: Phaser.GameObjects.GameObject[] }>(items: T[]) =>
      items.filter((item) => {
        if (item.x1 >= leftEdge || (item as unknown) === this.onRamp) return true;
        item.parts.forEach((p) => p.destroy());
        return false;
      });
    this.ramps = keep(this.ramps);
    this.gaps = keep(this.gaps);
  }

  // --- Gameplay ----------------------------------------------------------

  private touchEnemy(enemy: Enemy): void {
    if (enemy.dead || this.over) return;
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
      this.stomps += 1;
      audio.sfx("stomp");
    } else {
      this.hurt();
    }
  }

  /** No knockback here: the bike keeps rolling and blinks through the obstacle. */
  private hurt(): void {
    if (this.over) return;
    const result = this.player.health.hit(this.time.now);
    if (result === "ignored") return;
    if (result === "dead") return this.gameOver();
    audio.sfx("hurt");
    this.cameras.main.shake(80, 0.004);
    this.emitHud();
  }

  private pickUp(item: Phaser.Physics.Arcade.Image): void {
    if (item.getData("kind") === "heart") {
      if (!this.player.health.heal()) return;
      itemSparkle(this, item.x, item.y, 0xff6080);
      audio.sfx("heart");
    } else {
      this.diamonds += 1;
      const { total, heartEarned } = collectDiamond(session.progress.diamonds);
      addDiamond(total);
      audio.sfx("diamond");
      if (heartEarned && this.player.health.heal()) audio.sfx("heart");
      burstDiamond(this, item.x, item.y, item.depth);
    }
    item.destroy();
    this.emitHud();
  }

  /** Floating text above the rider. */
  private popup(message: string): void {
    const t = this.add
      .text(this.player.x, this.player.y - 44, message, {
        fontFamily: `${FONT}, monospace`,
        fontSize: "8px",
        color: "#ffe066",
        stroke: "#1d1b2a",
        strokeThickness: 3,
        align: "center",
      })
      .setOrigin(0.5)
      .setResolution(ZOOM)
      .setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private gameOver(): void {
    this.over = true;
    this.emitHud();
    audio.stopMusic();
    audio.sfx("death");
    this.player.anims.stop();
    this.player.setAlpha(1);
    this.player.body.setAllowGravity(true);
    this.player.body.checkCollision.none = true;
    this.player.setVelocity(0, -320);
    this.player.setHeadTint(0xffaaaa);
    this.cameras.main.stopFollow();
    const rank = recordRun(this.score, this.data_.characterId);
    this.time.delayedCall(1400, () => {
      this.scene.stop(SCENES.hud);
      this.scene.start(SCENES.runnerOver, { score: this.score, rank, characterId: this.data_.characterId } satisfies RunnerOverData);
    });
  }

  private emitHud(): void {
    const state: HudState = {
      hearts: this.player.health.hearts,
      maxHearts: this.player.health.max,
      diamonds: session.progress.diamonds,
      characterId: this.data_.characterId,
      levelName: "MTB Trail",
      score: this.score,
    };
    this.registry.set("hud", state);
  }
}

interface HazardSpec {
  texture: string;
  frame?: number;
  width: number;
  height: number;
  /** Hit box: width, height, offset x, offset y. */
  body: [number, number, number, number];
}

const HAZARDS: Record<"rock" | "log" | "logPile" | "stump", HazardSpec> = {
  rock: { texture: "tiles", frame: FRAME.rock, width: 18, height: 18, body: [14, 7, 2, 11] },
  log: { texture: "log", width: 34, height: 10, body: [30, 8, 2, 2] },
  logPile: { texture: "log-pile", width: 34, height: 18, body: [30, 16, 2, 2] },
  stump: { texture: "stump", width: 14, height: 13, body: [12, 11, 1, 2] },
};

/** Trail ground, ramps and obstacles, drawn once. */
function makeTrailTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists("trail-ground")) return;
  const tiles = scene.textures.get("tiles");
  const src = tiles.getSourceImage() as HTMLImageElement;
  const ground = scene.textures.createCanvas("trail-ground", TILE, TILE * 2)!;
  [TRAIL_TOP[2], TRAIL_FILL[2]].forEach((frame, i) => {
    const f = tiles.get(frame);
    ground.getContext().drawImage(src, f.cutX, f.cutY, TILE, TILE, 0, i * TILE, TILE, TILE);
  });
  ground.refresh();

  const outline = "#3b2418";
  const bark = "#8a5532";
  const barkDark = "#6b3f24";
  const wood = "#e0b07a";

  const drawLog = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number) => {
    ctx.fillStyle = outline;
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = bark;
    ctx.fillRect(x + 1, y + 1, w - 2, 8);
    ctx.fillStyle = barkDark;
    for (let i = x + 4; i < x + w - 6; i += 7) ctx.fillRect(i, y + 3, 4, 1);
    ctx.fillRect(x + 1, y + 7, w - 2, 2);
    // Cut end with growth rings
    ctx.fillStyle = outline;
    ctx.fillRect(x + w - 8, y, 8, 10);
    ctx.fillStyle = wood;
    ctx.fillRect(x + w - 7, y + 1, 6, 8);
    ctx.fillStyle = barkDark;
    ctx.fillRect(x + w - 5, y + 3, 2, 4);
  };

  const log = scene.textures.createCanvas("log", 34, 10)!;
  drawLog(log.getContext(), 0, 0, 34);
  log.refresh();

  const pile = scene.textures.createCanvas("log-pile", 34, 18)!;
  drawLog(pile.getContext(), 0, 8, 34);
  drawLog(pile.getContext(), 5, 0, 26);
  pile.refresh();

  const stump = scene.textures.createCanvas("stump", 14, 13)!;
  const sc = stump.getContext();
  sc.fillStyle = outline;
  sc.fillRect(0, 2, 14, 11);
  sc.fillRect(1, 0, 12, 4);
  sc.fillStyle = bark;
  sc.fillRect(1, 4, 12, 8);
  sc.fillStyle = wood;
  sc.fillRect(2, 1, 10, 3);
  sc.fillStyle = barkDark;
  sc.fillRect(5, 2, 4, 1);
  sc.fillRect(4, 6, 1, 5);
  sc.fillRect(9, 5, 1, 6);
  stump.refresh();

  for (const [size, spec] of Object.entries(RAMPS)) {
    const { length: w, height: h } = spec;
    const ramp = scene.textures.createCanvas(`ramp-${size}`, w, h)!;
    const ctx = ramp.getContext();
    const dot = (x: number, y: number, color: string, hh = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, hh);
    };
    // Solid wooden kicker: planked side panel under the curve, outlined, with a lighter riding surface.
    const side = "#a86b3c";
    const sideDark = "#8a5532";
    for (let x = 0; x < w; x++) {
      const top = Math.round(h - rampHeightAt(spec, (x + 1) / w));
      if (top >= h) {
        dot(x, h - 1, outline);
        continue;
      }
      dot(x, top, outline);
      if (h - top > 1) dot(x, top + 1, wood, Math.min(2, h - top - 1));
      if (h - top > 3) dot(x, top + 3, x % 6 === 0 ? sideDark : side, h - top - 3);
      dot(x, h - 1, outline);
    }
    // Back wall of the lip
    for (let y = 0; y < h; y++) dot(w - 1, y, outline);
    ramp.refresh();
  }
}
