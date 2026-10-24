import { describe, expect, it } from "vitest";
import { knobOffset, stickDirection, touchZone } from "./stick";

describe("stickDirection", () => {
  it("is undefined inside the dead zone", () => {
    expect(stickDirection(0, 10)).toBeUndefined();
    expect(stickDirection(9, 10)).toBeUndefined();
    expect(stickDirection(-9, 10)).toBeUndefined();
  });

  it("is right past the dead zone to the right", () => {
    expect(stickDirection(11, 10)).toBe("right");
  });

  it("is left past the dead zone to the left", () => {
    expect(stickDirection(-11, 10)).toBe("left");
  });

  it("ignores vertical drag", () => {
    expect(stickDirection(0, 10)).toBeUndefined();
  });
});

describe("knobOffset", () => {
  it("follows the finger inside the radius", () => {
    expect(knobOffset(10, -5, 40)).toEqual({ x: 10, y: -5 });
  });

  it("clamps to the rim beyond the radius", () => {
    const o = knobOffset(80, 0, 40);
    expect(o.x).toBeCloseTo(40);
    expect(o.y).toBeCloseTo(0);
  });

  it("clamps diagonally along the same direction", () => {
    const o = knobOffset(60, 80, 50);
    expect(o.x).toBeCloseTo(30);
    expect(o.y).toBeCloseTo(40);
  });
});

describe("touchZone", () => {
  it("is move on the left half of the screen", () => {
    expect(touchZone(10, 400)).toBe("move");
    expect(touchZone(199, 400)).toBe("move");
  });

  it("is jump on the right half of the screen", () => {
    expect(touchZone(200, 400)).toBe("jump");
    expect(touchZone(399, 400)).toBe("jump");
  });
});
