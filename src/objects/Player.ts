import Phaser from "phaser";
import { audio } from "../audio/audio";
import { PHYSICS } from "../config";
import type { Controls } from "../input/controls";
import { Health } from "../logic/health";
import { HEAD_SIZE } from "../scenes/Boot";

const HEAD_DISPLAY = 22;

/** How a Player is drawn: on foot, or riding a mountain bike in MTB Trail. */
export type Vehicle = "feet" | "bike";

interface Look {
  texture: string;
  anim: string;
  moveFrames: number[];
  frameRate: number;
  standFrame: number;
  airFrame: number;
  size: [number, number];
  offset: [number, number];
  /** The point the sprite stands on and rotates around, as a fraction of the frame. */
  origin: [number, number];
  /** Head centre relative to the origin, before rotation. */
  head: { x: number; y: number };
  /** Bob the head on stride frames. */
  bob: boolean;
  /**
   * Drawn by a separate sprite that can tilt without moving the physics body. Points are in frame
   * pixels: the centre it spins around in the air, and the rear-wheel contact used for wheelies.
   */
  tilting?: { center: [number, number]; rear: [number, number]; sagFrames: number[] };
}

function lookFor(vehicle: Vehicle, id: string): Look {
  return vehicle === "bike"
    ? {
        texture: `bike-${id}`,
        anim: `ride-${id}`,
        moveFrames: [0, 1, 2, 3],
        frameRate: 12,
        standFrame: 0,
        airFrame: 0,
        size: [22, 22],
        offset: [5, 10],
        // The physics sprite stands on the rear wheel.
        origin: [7 / 32, 1],
        head: { x: 9, y: -31 },
        bob: false,
        tilting: { center: [16, 22], rear: [7, 32], sagFrames: [4, 5, 6] },
      }
    : {
        texture: `body-${id}`,
        anim: `walk-${id}`,
        moveFrames: [1, 0, 2, 0],
        frameRate: 10,
        standFrame: 0,
        airFrame: 3,
        size: [10, 28],
        offset: [3, 4],
        origin: [0.5, 1],
        head: { x: 0, y: -24 },
        bob: true,
      };
}

/** The Character being controlled: a pixel body with the kid's photo as its head. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly health: Health;
  declare body: Phaser.Physics.Arcade.Body;
  private head: Phaser.GameObjects.Image;
  private lastGroundedAt = -Infinity;
  private jumpQueuedAt = -Infinity;
  private controlLockedUntil = 0;
  private rising = false;
  private look: Look;
  /** The drawn bike, for looks that tilt. */
  private visual?: Phaser.GameObjects.Sprite;
  /** Bike angle in degrees, unwrapped so whole flips can be counted. Negative leans back. */
  tilt = 0;
  /** 1 tilts around the rear wheel (wheelies, ramps), 0 around the bike's centre (flips). */
  anchor = 1;
  /** Pixels the suspension is compressed. */
  sag = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly characterId: string, maxHearts?: number, vehicle: Vehicle = "feet") {
    const look = lookFor(vehicle, characterId);
    super(scene, x, y, look.texture, look.standFrame);
    this.look = look;
    this.health = new Health(maxHearts);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(...look.origin).setDepth(10);
    this.body.setSize(...look.size).setOffset(...look.offset);
    this.setCollideWorldBounds(false);
    this.head = scene.add.image(x, y, `head-${characterId}`).setScale(HEAD_DISPLAY / HEAD_SIZE).setDepth(11);
    if (look.tilting) {
      const [cx, cy] = look.tilting.center;
      this.visual = scene.add.sprite(x, y, look.texture, look.standFrame).setOrigin(cx / this.width, cy / this.height).setDepth(10);
      this.setVisible(false);
    }
    // Follow the body after physics has moved it this frame, so the head never trails behind.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncHead, this);

    if (!scene.anims.exists(look.anim)) {
      scene.anims.create({
        key: look.anim,
        frames: scene.anims.generateFrameNumbers(look.texture, { frames: look.moveFrames }),
        frameRate: look.frameRate,
        repeat: -1,
      });
    }
  }

  get grounded(): boolean {
    return this.body.blocked.down;
  }

  /**
   * `traction` below 1 makes the ground slippery (ice); air control is unaffected.
   * With `autoRunSpeed` the Player runs right on their own and only jump is read.
   */
  control(controls: Controls, now: number, dt: number, traction = 1, autoRunSpeed?: number): void {
    if (this.grounded) this.lastGroundedAt = now;
    if (controls.pressed("jump")) this.jumpQueuedAt = now;

    if (now >= this.controlLockedUntil) {
      const dir = autoRunSpeed !== undefined ? 1 : (controls.held("right") ? 1 : 0) - (controls.held("left") ? 1 : 0);
      const target = autoRunSpeed ?? dir * PHYSICS.walkSpeed;
      const vx = this.body.velocity.x;
      const grip = this.grounded ? traction : 1;
      this.setVelocityX(vx + (target - vx) * Math.min(1, PHYSICS.acceleration * grip * dt));
      if (dir !== 0) this.setFlipX(dir < 0);

      const canJump = now - this.lastGroundedAt <= PHYSICS.coyoteMs;
      if (canJump && now - this.jumpQueuedAt <= PHYSICS.jumpBufferMs) {
        this.setVelocityY(-PHYSICS.jumpVelocity);
        this.jumpQueuedAt = -Infinity;
        this.lastGroundedAt = -Infinity;
        this.rising = true;
        audio.sfx("jump");
      }
    }

    // Variable jump height: letting go early cuts the rise short.
    if (this.rising && !controls.held("jump") && this.body.velocity.y < 0) {
      this.setVelocityY(this.body.velocity.y * PHYSICS.jumpCut);
      this.rising = false;
    }
    if (this.body.velocity.y >= 0) this.rising = false;

    this.animate();
    this.setAlpha(this.health.isInvincible(now) && Math.floor(now / 80) % 2 === 0 ? 0.3 : 1);
  }

  bounce(jumpHeld: boolean): void {
    this.setVelocityY(-(jumpHeld ? PHYSICS.stompBounceHeld : PHYSICS.stompBounce));
    this.rising = jumpHeld;
  }

  launch(velocity = PHYSICS.springVelocity): void {
    this.setVelocityY(-velocity);
    this.rising = false;
    this.lastGroundedAt = -Infinity;
  }

  knockback(fromX: number, now: number): void {
    const away = this.x < fromX ? -1 : 1;
    this.setVelocity(away * PHYSICS.knockbackX, -PHYSICS.knockbackY);
    this.rising = false;
    this.controlLockedUntil = now + PHYSICS.knockbackLockMs;
  }

  /** Puts the Player back at a spot with no speed, e.g. after falling in a pit. */
  respawnAt(x: number, y: number): void {
    this.body.reset(x, y);
    this.setVelocity(0, 0);
  }

  syncHead(): void {
    if (this.visual && this.look.tilting) return this.syncTilting(this.visual, this.look.tilting);
    const bob = this.look.bob && this.anims.isPlaying && Number(this.frame.name) !== 0 ? -1 : 0;
    const dx = (this.flipX ? -1 : 1) * this.look.head.x;
    const dy = this.look.head.y + bob;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    this.head.setPosition(this.x + dx * cos - dy * sin, this.y + dx * sin + dy * cos);
    this.head.setAlpha(this.alpha).setAngle(this.angle);
  }

  /** Places the drawn bike and head: spun around the centre, shifted so the rear wheel stays put by `anchor`. */
  private syncTilting(visual: Phaser.GameObjects.Sprite, t: NonNullable<Look["tilting"]>): void {
    const ox = this.displayOriginX;
    const oy = this.displayOriginY;
    const [cx, cy] = t.center;
    const rad = Phaser.Math.DegToRad(this.tilt);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rot = (x: number, y: number) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
    const rx = t.rear[0] - cx;
    const ry = t.rear[1] - cy;
    const rr = rot(rx, ry);
    const x = this.x + (cx - ox) + this.anchor * (rx - rr.x);
    const y = this.y + (cy - oy) + this.anchor * (ry - rr.y);
    visual.setPosition(x, y).setAngle(this.tilt).setFrame(this.frame.name).setAlpha(this.alpha);
    const head = rot(ox + this.look.head.x - cx, oy + this.look.head.y - cy + this.sag);
    this.head.setPosition(x + head.x, y + head.y).setAngle(this.tilt).setAlpha(this.alpha);
  }

  /** Light2D on the body, the photo head and the bike together. */
  setLit(enabled: boolean): this {
    this.setLighting(enabled);
    this.head.setLighting(enabled);
    this.visual?.setLighting(enabled);
    return this;
  }

  setHeadTint(tint: number | undefined): void {
    if (tint === undefined) this.head.clearTint();
    else this.head.setTint(tint);
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncHead, this);
    this.head.destroy();
    this.visual?.destroy();
    super.destroy(fromScene);
  }

  private animate(): void {
    const sagFrames = this.look.tilting?.sagFrames;
    if (this.sag > 0 && sagFrames && this.grounded) {
      this.anims.stop();
      this.setFrame(sagFrames[Math.min(this.sag, sagFrames.length) - 1]);
    } else if (!this.grounded) {
      this.anims.stop();
      this.setFrame(this.look.airFrame);
    } else if (Math.abs(this.body.velocity.x) > 20) {
      this.anims.play(this.look.anim, true);
    } else {
      this.anims.stop();
      this.setFrame(this.look.standFrame);
    }
  }
}
