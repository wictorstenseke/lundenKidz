import Phaser from "phaser";
import type { EnemyKind } from "../levels/parse";

interface KindSpec {
  frames: number[];
  squashFrame: number;
  speed: number;
  stompable: boolean;
  size: [number, number];
  offset: [number, number];
  /** Milliseconds between hops; 0 never hops. */
  hopEvery: number;
}

// Frames in the Kenney character sheet (24px).
const KINDS: Record<EnemyKind, KindSpec> = {
  walker: { frames: [18, 19], squashFrame: 20, speed: 38, stompable: true, size: [14, 12], offset: [5, 12], hopEvery: 0 },
  hopper: { frames: [13, 14], squashFrame: 13, speed: 22, stompable: true, size: [10, 14], offset: [7, 10], hopEvery: 1600 },
  spiky: { frames: [15, 16], squashFrame: 15, speed: 28, stompable: false, size: [16, 18], offset: [4, 6], hopEvery: 0 },
};

export type IsSolidAt = (worldX: number, worldY: number) => boolean;
/** Things enemies turn around at even though they aren't solid, like springs. */
export type IsObstacleAt = (worldX: number, worldY: number) => boolean;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly stompable: boolean;
  dead = false;
  private dir = -1;
  private nextHopAt: number;
  private spec: KindSpec;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly kind: EnemyKind,
    private readonly isSolidAt: IsSolidAt,
    private readonly isObstacleAt: IsObstacleAt,
  ) {
    super(scene, x, y, "chars", KINDS[kind].frames[0]);
    this.spec = KINDS[kind];
    this.stompable = this.spec.stompable;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(5);
    this.body.setSize(...this.spec.size).setOffset(...this.spec.offset);
    this.nextHopAt = scene.time.now + this.spec.hopEvery * Math.random();

    const anim = `enemy-${kind}`;
    if (!scene.anims.exists(anim)) {
      scene.anims.create({ key: anim, frames: scene.anims.generateFrameNumbers("chars", { frames: this.spec.frames }), frameRate: 4, repeat: -1 });
    }
    this.play(anim);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead || !this.body) return;
    const b = this.body;

    if (b.blocked.left) this.dir = 1;
    else if (b.blocked.right) this.dir = -1;
    else if (b.blocked.down) {
      // Turn at ledges and obstacles instead of walking off or over them.
      const frontX = this.dir > 0 ? b.right + 1 : b.left - 1;
      if (!this.isSolidAt(frontX, b.bottom + 1) || this.isObstacleAt(frontX, b.bottom - 2)) this.dir = -this.dir;
    }
    this.setVelocityX(this.dir * this.spec.speed);
    this.setFlipX(this.dir > 0);

    if (this.spec.hopEvery && b.blocked.down && time >= this.nextHopAt) {
      this.setVelocityY(-280);
      this.nextHopAt = time + this.spec.hopEvery;
    }
  }

  /** Walk away, e.g. after bumping into the Player. */
  turnAround(fromX: number): void {
    this.dir = this.x < fromX ? -1 : 1;
  }

  squash(): void {
    this.dead = true;
    this.anims.stop();
    this.setFrame(this.spec.squashFrame);
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.3,
      alpha: 0,
      duration: 300,
      onComplete: () => this.destroy(),
    });
  }
}
