export interface Progress {
  /** How many Levels, counted from the first, can be played. */
  unlockedLevels: number;
  /** Lifetime Diamond total. */
  diamonds: number;
}

const KEY = "lundenkidz.progress";
const fresh = (): Progress => ({ unlockedLevels: 1, diamonds: 0 });

export function loadProgress(storage: Storage | undefined): Progress {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      unlockedLevels: Math.max(1, Number(parsed.unlockedLevels) || 1),
      diamonds: Math.max(0, Number(parsed.diamonds) || 0),
    };
  } catch {
    return fresh();
  }
}

export function saveProgress(storage: Storage | undefined, progress: Progress): void {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private mode or blocked storage: progress just won't persist.
  }
}

export function completeLevel(progress: Progress, levelIndex: number, levelCount: number): Progress {
  const unlockedLevels = Math.min(levelCount, Math.max(progress.unlockedLevels, levelIndex + 2));
  return { ...progress, unlockedLevels };
}

/** Browser storage, or undefined when access throws. */
export function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
