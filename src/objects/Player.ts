import Phaser from "phaser";
import { audio } from "../audio/audio";
import { spriteKindOf } from "../characters";
import { PHYSICS } from "../config";
import type { Controls } from "../input/controls";
import { Health } from "../logic/health";
import { HEAD_SIZE } from "../scenes/Boot";
import { ANIM, bikeTexture, bodyTexture, FRAME_SIZE, headAnchor, JUMP, ORIGIN, type SpriteKind } from "./sprites";

const HEAD_DISPLAY = 22;
/** Faster than this and the run cycle plays instead of the walk. */
const RUN_THRESHOLD = (PHYSICS.walkSpeed + PHYSICS.runSpeed) / 2;
/** Landing frames shown after touching down, when standing still. */
const LAND_MS = 70;
const RECOVER_MS = 140;

/** How a Player is drawn: on foot, or riding a mountain bike in MTB Trail. */
export type Vehicle = "feet" | "bike";

interface Look {
  texture: string;
  size: [number, number];
  offset: [number, number];
  /** The point the sprite stands on and rotates around, as a fraction of the frame. */
  origin: [number, number];
  /**
   * Drawn by a separate sprite that can tilt without moving the physics body. Points are in frame
   * pixels: the centre it spins around in the air, and the rear-wheel contact used for wheelies.
   */
  tilting?: { center: [number, number]; rear: [number, number] };
}

/** Rear wheel contact on the bike sheet. */
const REAR_WHEEL: [number, number] = [7.5, ORIGIN.y];

function lookFor(vehicle: Vehicle, id: string): Look {
  return vehicle === "bike"
    ? {
        texture: bikeTexture(id),
        size: [22, 20],
        offset: [5, 10],
        // The physics sprite stands on the rear wheel.
        origin: [REAR_WHEEL[0] / FRAME_SIZE, REAR_WHEEL[1] / FRAME_SIZE],
        tilting: { center: [16, 23], rear: REAR_WHEEL },
      }
    : {
        texture: bodyTexture(id),
        size: [10, 26],
        offset: [11, 4],
        origin: [ORIGIN.x / FRAME_SIZE, ORIGIN.y / FRAME_SIZE],
      };
}

/** The Character being controlled: a pixel body with the kid's photo as its head. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly health: Health;
  declare body: Phaser.Physics.Arcade.Body;
  private head: Phaser.GameObjects.Image;
  private readonly kind: SpriteKind;
  private readonly vehicle: Vehicle;
  private lastGroundedAt = -Infinity;
  private jumpQueuedAt = -Infinity;
  private controlLockedUntil = 0;
  private rising = false;
  private wasGrounded = true;
  private leftGroundAt = -Infinity;
  private landedAt = -Infinity;
  private look: Look;
  /** The drawn bike, for looks that tilt. */
  private visual?: Phaser.GameObjects.Sprite;
  /** Bike angle in degrees, unwrapped so whole flips can be counted. Negative leans back. */
  tilt = 0;
  /** 1 tilts around the rear wheel (wheelies, ramps), 0 around the bike's centre (flips). */
  anchor = 1;
  /** Pixels the suspension is compressed: the bike squashes down onto its wheels. */
  sag = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly characterId: string, maxHearts?: number, vehicle: Vehicle = "feet") {
    const look = lookFor(vehicle, characterId);
    super(scene, x, y, look.texture, 0);
    this.look = look;
    this.vehicle = vehicle;
    this.kind = spriteKindOf(characterId);
    this.health = new Health(maxHearts);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(...look.origin).setDepth(10);
    this.body.setSize(...look.size).setOffset(...look.offset);
    this.setCollideWorldBounds(false);
    this.head = scene.add.image(x, y, `head-${characterId}`).setScale(HEAD_DISPLAY / HEAD_SIZE).setDepth(11);
    if (look.tilting) {
      const [cx, cy] = look.tilting.center;
      this.visual = scene.add.sprite(x, y, look.texture, 0).setOrigin(cx / this.width, cy / this.height).setDepth(10);
      this.setVisible(false);
    }
    // Follow the body after physics has moved it this frame, so the head never trails behind.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncHead, this);
  }

  get grounded(): boolean {
    return this.body.blocked.down;
  }

  /**
   * `traction` below 1 makes the ground slippery (ice); air control is unaffected.
   * Holding sprint runs instead of walks. With `autoRunSpeed` the Player runs right on their own
   * and only jump is read.
   */
  control(controls: Controls, now: number, dt: number, traction = 1, autoRunSpeed?: number): void {
    const grounded = this.grounded;
    if (grounded) this.lastGroundedAt = now;
    if (grounded && !this.wasGrounded) this.landedAt = now;
    if (!grounded && this.wasGrounded) this.leftGroundAt = now;
    this.wasGrounded = grounded;
    if (controls.pressed("jump")) this.jumpQueuedAt = now;

    if (now >= this.controlLockedUntil) {
      const dir = autoRunSpeed !== undefined ? 1 : (controls.held("right") ? 1 : 0) - (controls.held("left") ? 1 : 0);
      const speed = controls.held("sprint") ? PHYSICS.runSpeed : PHYSICS.walkSpeed;
      const target = autoRunSpeed ?? dir * speed;
      const vx = this.body.velocity.x;
      const grip = grounded ? traction : 1;
      this.setVelocityX(vx + (target - vx) * Math.min(1, PHYSICS.acceleration * grip * dt));
      if (dir !== 0) this.setFlipX(dir < 0);

      const canJump = now - this.lastGroundedAt <= PHYSICS.coyoteMs;
      if (canJump && now - this.jumpQueuedAt <= PHYSICS.jumpBufferMs) {
        this.setVelocityY(-PHYSICS.jumpVelocity);
        this.jumpQueuedAt = -Infinity;
        this.lastGroundedAt = -Infinity;
        this.leftGroundAt = now;
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

    this.animate(now);
    this.setAlpha(this.health.isInvincible(now) && Math.floor(now / 80) % 2 === 0 ? 0.3 : 1);
  }

  bounce(jumpHeld: boolean): void {
    this.setVelocityY(-(jumpHeld ? PHYSICS.stompBounceHeld : PHYSICS.stompBounce));
    this.rising = jumpHeld;
    this.leftGroundAt = this.scene.time.now;
  }

  launch(velocity = PHYSICS.springVelocity): void {
    this.setVelocityY(-velocity);
    this.rising = false;
    this.lastGroundedAt = -Infinity;
    this.leftGroundAt = this.scene.time.now;
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

  /** Head offset from the origin for the frame being shown, mirrored when facing left. */
  private headOffset(): { x: number; y: number } {
    const a = headAnchor(this.kind, Number(this.frame.name), this.vehicle);
    return { x: (this.flipX ? -1 : 1) * (a.x - this.displayOriginX), y: a.y - this.displayOriginY };
  }

  syncHead(): void {
    if (this.visual && this.look.tilting) return this.syncTilting(this.visual, this.look.tilting);
    const { x: dx, y: dy } = this.headOffset();
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    this.head.setPosition(this.x + dx * cos - dy * sin, this.y + dx * sin + dy * cos);
    this.head.setAlpha(this.alpha).setAngle(this.angle);
  }

  /**
   * Places the drawn bike and head: spun around the centre, shifted so the rear wheel stays put by
   * `anchor`, and squashed down onto the wheels by `sag`.
   */
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
    // Squash towards the wheel line and drop by the same amount, so the wheels stay on the ground.
    const squash = (FRAME_SIZE - this.sag * 2) / FRAME_SIZE;
    const drop = (ORIGIN.y - cy) * (1 - squash);
    visual.setPosition(x, y + drop).setAngle(this.tilt).setFrame(this.frame.name).setAlpha(this.alpha).setScale(1, squash);
    const h = this.headOffset();
    const head = rot(ox + h.x - cx, (oy + h.y - cy) * squash);
    this.head.setPosition(x + head.x, y + drop + head.y).setAngle(this.tilt).setAlpha(this.alpha);
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

  private animate(now: number): void {
    if (this.vehicle === "bike") return this.animateBike();
    const id = this.characterId;
    const speed = Math.abs(this.body.velocity.x);
    if (!this.grounded) return this.hold(this.jumpFrame(now));
    const sinceLanding = now - this.landedAt;
    if (speed < 20 && sinceLanding < LAND_MS + RECOVER_MS) return this.hold(sinceLanding < LAND_MS ? JUMP.land : JUMP.recover);
    if (speed > 20) this.anims.play(speed > RUN_THRESHOLD ? ANIM.run(id) : ANIM.walk(id), true);
    else this.anims.play(ANIM.idle(id), true);
  }

  /** The jump pose that matches the flight: a short takeoff and tuck, then rise, apex and fall. */
  private jumpFrame(now: number): number {
    const vy = this.body.velocity.y;
    if (vy < -60) {
      const since = now - this.leftGroundAt;
      return since < 70 ? JUMP.takeoff : since < 160 ? JUMP.riseTuck : JUMP.rise;
    }
    return vy < 60 ? JUMP.apex : JUMP.fall;
  }

  private animateBike(): void {
    if (!this.grounded) return this.hold(0);
    if (Math.abs(this.body.velocity.x) > 20) this.anims.play(ANIM.ride(this.characterId), true);
    else this.hold(0);
  }

  private hold(frame: number): void {
    this.anims.stop();
    this.setFrame(frame);
  }
}
