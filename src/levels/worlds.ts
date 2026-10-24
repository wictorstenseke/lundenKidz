import { LEVELS } from "./levels";

/** Every World holds this many Levels, in order, from the flat LEVELS list. */
export const WORLD_SIZE = 5;

export interface WorldDef {
  /** Single letter shown in Level labels: A-1, B-3 … */
  letter: string;
  name: string;
}

export const WORLDS: WorldDef[] = [
  { letter: "A", name: "Home Hills" },
  { letter: "B", name: "Alpine Peaks" },
  { letter: "C", name: "Sunburnt Desert" },
  { letter: "D", name: "Far & Wild" },
];

/** Index into WORLDS of the World a Level belongs to. */
export const worldOf = (levelIndex: number): number => Math.floor(levelIndex / WORLD_SIZE);

/** Indices into LEVELS of one World's Levels, in order. */
export function levelsInWorld(worldIndex: number): number[] {
  const first = worldIndex * WORLD_SIZE;
  return LEVELS.slice(first, first + WORLD_SIZE).map((_, i) => first + i);
}

/** "B-3" for the third Level of World B. */
export function levelLabel(levelIndex: number): string {
  const world = WORLDS[worldOf(levelIndex)];
  return `${world?.letter ?? "?"}-${(levelIndex % WORLD_SIZE) + 1}`;
}

/** True when `levelIndex` is the last Level of its World (and not the last Level overall). */
export function endsWorld(levelIndex: number): boolean {
  return (levelIndex + 1) % WORLD_SIZE === 0 && levelIndex + 1 < LEVELS.length;
}

/** How many Worlds have at least one playable Level, given the unlocked Level count. */
export const unlockedWorlds = (unlockedLevels: number): number => Math.min(WORLDS.length, Math.ceil(unlockedLevels / WORLD_SIZE));
