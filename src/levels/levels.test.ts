import { describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import { parseLevel } from "./parse";

describe.each(LEVELS.map((l, i) => [i + 1, l] as const))("Level %i", (_n, def) => {
  const level = parseLevel(def.rows);

  it("is at least 12 tiles tall", () => expect(level.height).toBeGreaterThanOrEqual(12));

  it("has everything that stands resting on solid ground", () => {
    const standing = [level.start, level.goal, ...level.checkpoints, ...level.enemies, ...level.heartPickups, ...level.springs, ...level.decor, ...level.lanterns];
    for (const s of standing) {
      expect(level.terrain[s.y + 1]?.[s.x], `thing at ${s.x},${s.y}`).not.toBe("empty");
    }
  });

  it("has the Goal Flag away from the start", () => {
    expect(level.goal).not.toEqual(level.start);
  });

  it("has at least 15 Diamonds", () => expect(level.diamonds.length).toBeGreaterThanOrEqual(15));
});

describe("Tiled assets", () => {
  const files = Object.keys(import.meta.glob("/public/assets/**/*.tmj", { query: "?raw", eager: true }));
  it.each(LEVELS.filter((l) => l.tiled).map((l) => [l.name, l.tiled!] as const))("%s has its .tmj on disk", (_n, url) => {
    expect(files).toContain(`/public/${url}`);
  });
});
