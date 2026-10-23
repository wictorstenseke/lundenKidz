import { describe, expect, it } from "vitest";
import { completeLevel, loadProgress, saveProgress } from "./progress";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("progress", () => {
  it("defaults to only the first Level unlocked", () => {
    expect(loadProgress(memoryStorage())).toEqual({ unlockedLevels: 1, diamonds: 0 });
  });

  it("round-trips through storage", () => {
    const s = memoryStorage();
    saveProgress(s, { unlockedLevels: 3, diamonds: 42 });
    expect(loadProgress(s)).toEqual({ unlockedLevels: 3, diamonds: 42 });
  });

  it("survives corrupt or missing storage", () => {
    const s = memoryStorage();
    s.setItem("lundenkidz.progress", "{nope");
    expect(loadProgress(s)).toEqual({ unlockedLevels: 1, diamonds: 0 });
    expect(loadProgress(undefined)).toEqual({ unlockedLevels: 1, diamonds: 0 });
  });

  it("completing a Level unlocks the next, capped at the Level count", () => {
    const p = { unlockedLevels: 1, diamonds: 0 };
    expect(completeLevel(p, 0, 4).unlockedLevels).toBe(2);
    expect(completeLevel({ unlockedLevels: 4, diamonds: 0 }, 3, 4).unlockedLevels).toBe(4);
    expect(completeLevel({ unlockedLevels: 3, diamonds: 0 }, 0, 4).unlockedLevels).toBe(3);
  });
});
