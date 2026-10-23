import { describe, expect, it } from "vitest";
import { bandOffset } from "./parallax";

describe("bandOffset", () => {
  it("scales scroll by factor", () => {
    expect(bandOffset(100, 0.25)).toBe(25);
    expect(bandOffset(0, 0.45)).toBe(0);
    expect(bandOffset(-40, 0.5)).toBe(-20);
  });
});
