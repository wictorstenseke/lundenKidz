import { describe, expect, it } from "vitest";
import {
  airBonus,
  availablePatterns,
  flipName,
  gapRange,
  landing,
  levelOut,
  RAMP_JUMP_BOOST,
  rampHeightAt,
  rampPop,
  rampRunOut,
  rampSlopeAt,
  rollOffDistance,
  rollOffSpeed,
  RAMPS,
  RUN,
  sagFor,
  speedAt,
  wheelieBonus,
} from "./runner";

describe("speedAt", () => {
  it("starts slow and speeds up", () => {
    expect(speedAt(0)).toBe(RUN.startSpeed);
    expect(speedAt(10)).toBeGreaterThan(speedAt(5));
  });
  it("is capped", () => expect(speedAt(10_000)).toBe(RUN.maxSpeed));
});

describe("gapRange", () => {
  it("always leaves room to land and jump again", () => {
    for (const speed of [RUN.startSpeed, 250, RUN.maxSpeed]) {
      const [min] = gapRange(speed);
      // A full jump lasts ~0.82 s; the gap must exceed the distance covered in the air.
      expect(min).toBeGreaterThan(speed * 0.85);
    }
  });

  it("leaves room after a ramp pop (~1.1 s in the air)", () => {
    for (const speed of [RUN.startSpeed, RUN.maxSpeed]) {
      expect(rampRunOut(speed) + gapRange(speed)[0]).toBeGreaterThan(speed * 1.1);
    }
  });
});

describe("availablePatterns", () => {
  it("starts with simple hurdles and unlocks more over time", () => {
    expect(availablePatterns(0)).toContain("rock");
    expect(availablePatterns(0)).toContain("kicker");
    expect(availablePatterns(0)).not.toContain("spiky");
    expect(availablePatterns(120)).toContain("spiky");
    expect(availablePatterns(120).length).toBeGreaterThan(availablePatterns(0).length);
  });
});

describe("ramps", () => {
  it("a small kicker clears a three-tile gap even at the slowest speed", () => {
    const { launch, height } = RAMPS.small;
    const g = 1000;
    const airtime = (launch + Math.sqrt(launch ** 2 + 2 * g * height)) / g;
    expect(airtime * RUN.startSpeed).toBeGreaterThan(54 + 12);
  });

  it("rewards big air", () => {
    expect(airBonus(1.0)).toBe(0);
    expect(airBonus(1.15)).toBe(15);
    expect(airBonus(1.3)).toBe(30);
  });
});

describe("kicker shape", () => {
  it("curves up, steepening toward the lip", () => {
    const r = RAMPS.small;
    expect(rampHeightAt(r, 0)).toBe(0);
    expect(rampHeightAt(r, 1)).toBe(r.height);
    expect(rampHeightAt(r, 0.5)).toBeLessThan(r.height / 2);
    expect(rampSlopeAt(r, 1)).toBeGreaterThan(rampSlopeAt(r, 0.5));
  });

  it("rolling off lands further at higher speed", () => {
    expect(rollOffDistance(RAMPS.small, 400, 1000)).toBeGreaterThan(rollOffDistance(RAMPS.small, 170, 1000));
  });

  it("rolling off gives a kick, clearly below a pop even at top speed", () => {
    const v = rollOffSpeed(RAMPS.small, RUN.maxSpeed);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(RAMPS.small.launch * 0.7);
  });
});

describe("rampPop", () => {
  it("gives the ramp's launch, plus a boost near the lip", () => {
    expect(rampPop(470, 0.2)).toBe(470);
    expect(rampPop(470, 0.9)).toBe(470 + RAMP_JUMP_BOOST);
  });
});

describe("wheelieBonus", () => {
  it("pays 10 points per second, nothing for a quick tap", () => {
    expect(wheelieBonus(0.3)).toBe(0);
    expect(wheelieBonus(1.25)).toBe(12);
  });
});

describe("flips", () => {
  it("levels out toward the nearest upright angle", () => {
    expect(levelOut(-20, 1)).toBe(0);
    expect(levelOut(-20, 0.01)).toBeCloseTo(-17.4);
    expect(levelOut(-300, 1)).toBe(-360);
  });

  it("counts whole flips on a clean landing, signed by direction", () => {
    expect(landing(10)).toEqual({ crashed: false, flips: 0 });
    expect(landing(-350)).toEqual({ crashed: false, flips: -1 });
    expect(landing(735)).toEqual({ crashed: false, flips: 2 });
  });

  it("crashes when landing far from upright", () => {
    expect(landing(-180).crashed).toBe(true);
    expect(landing(90).crashed).toBe(true);
  });

  it("names flips", () => {
    expect(flipName(-1)).toBe("Backflip");
    expect(flipName(2)).toBe("Double frontflip");
  });

  it("sinks the suspension more on harder landings", () => {
    expect(sagFor(100)).toBe(1);
    expect(sagFor(350)).toBe(2);
    expect(sagFor(600)).toBe(3);
  });
});
