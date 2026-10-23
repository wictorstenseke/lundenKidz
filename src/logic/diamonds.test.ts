import { describe, expect, it } from "vitest";
import { collectDiamond, DIAMONDS_PER_HEART } from "./diamonds";

describe("collectDiamond", () => {
  it("increments the total", () => {
    expect(collectDiamond(4)).toEqual({ total: 5, heartEarned: false });
  });

  it("earns a Heart every 100 Diamonds", () => {
    expect(DIAMONDS_PER_HEART).toBe(100);
    expect(collectDiamond(99).heartEarned).toBe(true);
    expect(collectDiamond(199).heartEarned).toBe(true);
    expect(collectDiamond(100).heartEarned).toBe(false);
  });
});
