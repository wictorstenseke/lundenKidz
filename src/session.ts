import { addScore, loadHighscores, saveHighscores, type Highscore } from "./logic/highscores";
import { browserStorage, completeLevel, loadProgress, saveProgress, type Progress } from "./logic/progress";
import { LEVELS } from "./levels/levels";

/** Saved progress shared by all scenes. */
export const session: { progress: Progress; highscores: Highscore[] } = {
  progress: loadProgress(browserStorage()),
  highscores: loadHighscores(browserStorage()),
};

export function addDiamond(total: number): void {
  session.progress = { ...session.progress, diamonds: total };
  saveProgress(browserStorage(), session.progress);
}

export function markLevelComplete(levelIndex: number): void {
  session.progress = completeLevel(session.progress, levelIndex, LEVELS.length);
  saveProgress(browserStorage(), session.progress);
}

/** Adds an MTB Trail result to the top-5; returns its 0-based place, or undefined. */
export function recordRun(score: number, characterId: string): number | undefined {
  const { list, rank } = addScore(session.highscores, { score, characterId, date: new Date().toISOString().slice(0, 10) });
  session.highscores = list;
  saveHighscores(browserStorage(), list);
  return rank;
}
