import type { Terrain } from "./parse";
import type { Theme } from "./themes";

const PLATFORM: [number, number, number, number] = [47, 48, 49, 50];
const CLOUD: [number, number, number, number] = [156, 153, 154, 155];
/** Dirt with an outlined underside, for ceilings and overhangs. */
const UNDERSIDE: [number, number, number, number] = [140, 141, 142, 143];

/** Index into an edge row: 0 single, 1 left end, 2 middle, 3 right end. */
function edge(leftSame: boolean, rightSame: boolean): 0 | 1 | 2 | 3 {
  if (leftSame && rightSame) return 2;
  if (rightSame) return 1;
  if (leftSame) return 3;
  return 0;
}

/** Tile sheet frame for terrain at (x, y), or -1 for air. */
export function tileFrame(terrain: Terrain[][], x: number, y: number, theme: Theme): number {
  const t = terrain[y][x];
  const same = (dx: number) => terrain[y][x + dx] === t;
  switch (t) {
    case "empty":
      return -1;
    case "block":
      return theme.block;
    case "platform":
      return PLATFORM[edge(same(-1), same(1))];
    case "cloud":
      return CLOUD[edge(same(-1), same(1))];
    case "ground": {
      const above = y === 0 ? "ground" : terrain[y - 1][x];
      const below = y === terrain.length - 1 ? "ground" : terrain[y + 1][x];
      const covered = above === "ground" || above === "block";
      const row = !covered ? theme.groundTop : below === "empty" ? UNDERSIDE : theme.groundFill;
      // Off-map counts as ground so level edges don't get an outline.
      const solid = (dx: number) => (terrain[y][x + dx] ?? "ground") === "ground";
      return row[edge(solid(-1), solid(1))];
    }
  }
}
