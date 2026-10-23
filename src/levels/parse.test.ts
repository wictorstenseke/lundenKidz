import { describe, expect, it } from "vitest";
import { parseLevel } from "./parse";

describe("parseLevel", () => {
  const rows = [
    "        d    G",
    "  P l ===  c ",
    "#####   #####",
  ];

  it("reads size and pads ragged rows", () => {
    const level = parseLevel(rows);
    expect(level.width).toBe(14);
    expect(level.height).toBe(3);
    expect(level.terrain[2][13]).toBe("empty");
  });

  it("finds lanterns", () => {
    expect(parseLevel(rows).lanterns).toEqual([{ x: 4, y: 1 }]);
  });

  it("classifies terrain", () => {
    const level = parseLevel(rows);
    expect(level.terrain[2][0]).toBe("ground");
    expect(level.terrain[1][6]).toBe("platform");
    expect(level.terrain[2][5]).toBe("empty");
  });

  it("finds the start, Goal Flag, Checkpoints and Diamonds", () => {
    const level = parseLevel(rows);
    expect(level.start).toEqual({ x: 2, y: 1 });
    expect(level.goal).toEqual({ x: 13, y: 0 });
    expect(level.checkpoints).toEqual([{ x: 11, y: 1 }]);
    expect(level.diamonds).toEqual([{ x: 8, y: 0, id: "8,0" }]);
  });

  it("finds Enemies by type", () => {
    const level = parseLevel(["P w o s G", "#########"]);
    expect(level.enemies.map((e) => e.kind)).toEqual(["walker", "hopper", "spiky"]);
    expect(level.enemies[0]).toMatchObject({ x: 2, y: 0 });
  });

  it("reads cloud platforms, springs and decoration kinds", () => {
    const level = parseLevel(["P j t f i G", "###~~~#####"]);
    expect(level.terrain[1][3]).toBe("cloud");
    expect(level.springs).toEqual([{ x: 2, y: 0 }]);
    expect(level.decor.map((d) => d.kind)).toEqual(["plant", "fence", "sign"]);
  });

  it("rejects a Level without a start or Goal Flag", () => {
    expect(() => parseLevel(["  G", "###"])).toThrow(/start/);
    expect(() => parseLevel(["P  ", "###"])).toThrow(/Goal Flag/);
  });

  it("rejects unknown characters", () => {
    expect(() => parseLevel(["P ? G", "#####"])).toThrow(/'\?'/);
  });
});
