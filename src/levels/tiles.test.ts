import { describe, expect, it } from "vitest";
import { parseLevel } from "./parse";
import { tileFrame } from "./tiles";
import { THEMES } from "./themes";

const grass = THEMES.grass;

describe("tileFrame", () => {
  const level = parseLevel([
    "P   G   ",
    " ###  # ",
    " ###  = ",
  ]);
  const at = (x: number, y: number) => tileFrame(level.terrain, x, y, grass);

  it("is -1 for air", () => expect(at(0, 1)).toBe(-1));
  it("uses top edges where air is above", () => {
    expect(at(1, 1)).toBe(grass.groundTop[1]);
    expect(at(2, 1)).toBe(grass.groundTop[2]);
    expect(at(3, 1)).toBe(grass.groundTop[3]);
    expect(at(6, 1)).toBe(grass.groundTop[0]);
  });
  it("uses fill below the surface", () => expect(at(2, 2)).toBe(grass.groundFill[2]));
  it("treats out-of-bounds above as solid and outlines ceiling undersides", () => {
    const cave = parseLevel(["###", "###", " PG", "###"]);
    expect(tileFrame(cave.terrain, 1, 0, grass)).toBe(grass.groundFill[2]);
    expect(tileFrame(cave.terrain, 1, 1, grass)).toBe(142);
  });
  it("uses the plank platform tiles", () => expect(at(6, 2)).toBe(47));
  it("uses cloud tiles for cloud platforms", () => {
    const sky = parseLevel(["P   G", "~~~ ~"]);
    expect(tileFrame(sky.terrain, 0, 1, grass)).toBe(153);
    expect(tileFrame(sky.terrain, 1, 1, grass)).toBe(154);
    expect(tileFrame(sky.terrain, 2, 1, grass)).toBe(155);
    expect(tileFrame(sky.terrain, 4, 1, grass)).toBe(156);
  });
});
