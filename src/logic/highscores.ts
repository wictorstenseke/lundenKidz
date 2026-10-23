export interface Highscore {
  score: number;
  characterId: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
}

export const MAX_HIGHSCORES = 5;
const KEY = "lundenkidz.highscores";
const PX_PER_POINT = 18;
export const DIAMOND_POINTS = 10;
export const STOMP_POINTS = 25;

/** `bonus` is extra points earned directly, e.g. for big air. */
export function runScore(run: { distancePx: number; diamonds: number; stomps: number; bonus?: number }): number {
  return Math.floor(run.distancePx / PX_PER_POINT) + run.diamonds * DIAMOND_POINTS + run.stomps * STOMP_POINTS + (run.bonus ?? 0);
}

/** Inserts the entry below any equal scores; `rank` is its 0-based place, or undefined if it didn't make the list. */
export function addScore(list: Highscore[], entry: Highscore): { list: Highscore[]; rank?: number } {
  let at = list.findIndex((e) => e.score < entry.score);
  if (at === -1) at = list.length;
  const next = [...list.slice(0, at), entry, ...list.slice(at)].slice(0, MAX_HIGHSCORES);
  return { list: next, rank: at < MAX_HIGHSCORES ? at : undefined };
}

export function loadHighscores(storage: Storage | undefined): Highscore[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is Highscore => typeof e?.score === "number" && typeof e?.characterId === "string")
      .slice(0, MAX_HIGHSCORES);
  } catch {
    return [];
  }
}

export function saveHighscores(storage: Storage | undefined, list: Highscore[]): void {
  try {
    storage?.setItem(KEY, JSON.stringify(list));
  } catch {
    // Blocked storage: scores just won't persist.
  }
}
