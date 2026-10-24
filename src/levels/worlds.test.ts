import { describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import { endsWorld, levelLabel, levelsInWorld, unlockedWorlds, WORLD_SIZE, WORLDS, worldOf } from "./worlds";

describe("worlds", () => {
  it("split the Levels into equal Worlds", () => {
    expect(LEVELS.length).toBe(WORLDS.length * WORLD_SIZE);
  });

  it("label Levels by World letter and position", () => {
    expect(levelLabel(0)).toBe("A-1");
    expect(levelLabel(4)).toBe("A-5");
    expect(levelLabel(5)).toBe("B-1");
    expect(levelLabel(12)).toBe("C-3");
    expect(levelLabel(19)).toBe("D-5");
  });

  it("list each World's Levels in order", () => {
    expect(levelsInWorld(0)).toEqual([0, 1, 2, 3, 4]);
    expect(levelsInWorld(1)).toEqual([5, 6, 7, 8, 9]);
    expect(levelsInWorld(2).every((i) => worldOf(i) === 2)).toBe(true);
  });

  it("know where a World ends, except after the very last Level", () => {
    expect(endsWorld(4)).toBe(true);
    expect(endsWorld(9)).toBe(true);
    expect(endsWorld(3)).toBe(false);
    expect(endsWorld(LEVELS.length - 1)).toBe(false);
  });

  it("count unlocked Worlds from unlocked Levels", () => {
    expect(unlockedWorlds(1)).toBe(1);
    expect(unlockedWorlds(5)).toBe(1);
    expect(unlockedWorlds(6)).toBe(2);
    expect(unlockedWorlds(15)).toBe(3);
    expect(unlockedWorlds(16)).toBe(4);
    expect(unlockedWorlds(99)).toBe(WORLDS.length);
  });
});
