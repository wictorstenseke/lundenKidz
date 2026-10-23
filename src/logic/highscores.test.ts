import { describe, expect, it } from "vitest";
import { addScore, loadHighscores, runScore, saveHighscores, type Highscore } from "./highscores";

const entry = (score: number, characterId = "kid1"): Highscore => ({ score, characterId, date: "2026-10-22" });

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

describe("runScore", () => {
  it("is one point per tile run plus Diamond and Stomp bonuses", () => {
    expect(runScore({ distancePx: 180, diamonds: 2, stomps: 1 })).toBe(10 + 20 + 25);
    expect(runScore({ distancePx: 0, diamonds: 0, stomps: 0, bonus: 15 })).toBe(15);
  });
});

describe("addScore", () => {
  it("keeps the list sorted and reports the rank", () => {
    const { list, rank } = addScore([entry(50), entry(10)], entry(30));
    expect(list.map((e) => e.score)).toEqual([50, 30, 10]);
    expect(rank).toBe(1);
  });

  it("keeps only the top five", () => {
    const five = [90, 80, 70, 60, 50].map((s) => entry(s));
    expect(addScore(five, entry(55)).list.map((e) => e.score)).toEqual([90, 80, 70, 60, 55]);
  });

  it("reports no rank when the score doesn't make the list", () => {
    const five = [90, 80, 70, 60, 50].map((s) => entry(s));
    const { list, rank } = addScore(five, entry(5));
    expect(rank).toBeUndefined();
    expect(list).toHaveLength(5);
  });

  it("places a tie below the existing score", () => {
    expect(addScore([entry(50, "kid1")], entry(50, "kid2")).rank).toBe(1);
  });
});

describe("storage", () => {
  it("round-trips and survives garbage", () => {
    const s = memoryStorage();
    expect(loadHighscores(s)).toEqual([]);
    saveHighscores(s, [entry(42, "kid3")]);
    expect(loadHighscores(s)).toEqual([entry(42, "kid3")]);
    s.setItem("lundenkidz.highscores", "nope");
    expect(loadHighscores(s)).toEqual([]);
  });
});
