export type Terrain = "empty" | "ground" | "block" | "platform" | "cloud";
export type DecorKind = "plant" | "fence" | "sign";
export type EnemyKind = "walker" | "hopper" | "spiky";
/** A hand lantern on the ground, or a tall light post. */
export type LanternKind = "lantern" | "post";

export interface Cell {
  x: number;
  y: number;
}

export interface ParsedLevel {
  width: number;
  height: number;
  /** terrain[y][x] */
  terrain: Terrain[][];
  start: Cell;
  goal: Cell;
  checkpoints: Cell[];
  diamonds: (Cell & { id: string })[];
  heartPickups: Cell[];
  enemies: (Cell & { kind: EnemyKind })[];
  springs: Cell[];
  decor: (Cell & { kind: DecorKind })[];
  /** Lanterns and light posts: decoration that also carries a Light2D point light. */
  lanterns: (Cell & { kind: LanternKind })[];
}

/**
 * Level legend, one character per tile:
 *   # ground   B block   = one-way platform   ~ one-way cloud
 *   P start    G Goal Flag   c Checkpoint   j spring
 *   d Diamond  h Heart Pickup
 *   w Walker   o Hopper   s Spiky
 *   t plant    f fence   i sign   l lantern   L light post   space or . air
 */
export function parseLevel(rows: string[]): ParsedLevel {
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const terrain: Terrain[][] = [];
  const level: Omit<ParsedLevel, "start" | "goal"> & Partial<Pick<ParsedLevel, "start" | "goal">> = {
    width,
    height,
    terrain,
    checkpoints: [],
    diamonds: [],
    heartPickups: [],
    enemies: [],
    springs: [],
    decor: [],
    lanterns: [],
  };

  rows.forEach((row, y) => {
    terrain.push([]);
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? " ";
      const cell = { x, y };
      let t: Terrain = "empty";
      switch (ch) {
        case " ":
        case ".":
          break;
        case "#": t = "ground"; break;
        case "B": t = "block"; break;
        case "=": t = "platform"; break;
        case "~": t = "cloud"; break;
        case "j": level.springs.push(cell); break;
        case "P": level.start = cell; break;
        case "G": level.goal = cell; break;
        case "c": level.checkpoints.push(cell); break;
        case "d": level.diamonds.push({ ...cell, id: `${x},${y}` }); break;
        case "h": level.heartPickups.push(cell); break;
        case "w": level.enemies.push({ ...cell, kind: "walker" }); break;
        case "o": level.enemies.push({ ...cell, kind: "hopper" }); break;
        case "s": level.enemies.push({ ...cell, kind: "spiky" }); break;
        case "t": level.decor.push({ ...cell, kind: "plant" }); break;
        case "f": level.decor.push({ ...cell, kind: "fence" }); break;
        case "i": level.decor.push({ ...cell, kind: "sign" }); break;
        case "l": level.lanterns.push({ ...cell, kind: "lantern" }); break;
        case "L": level.lanterns.push({ ...cell, kind: "post" }); break;
        default:
          throw new Error(`Unknown level character '${ch}' at ${x},${y}`);
      }
      terrain[y].push(t);
    }
  });

  if (!level.start) throw new Error("Level has no start (P)");
  if (!level.goal) throw new Error("Level has no Goal Flag (G)");
  return level as ParsedLevel;
}
