import { describe, expect, it } from "vitest";
import { DEFAULT_FX, parseFxFlags } from "./flags";

describe("parseFxFlags", () => {
  it("returns defaults for empty search", () => {
    expect(parseFxFlags("")).toEqual(DEFAULT_FX);
  });
  it("does not mutate defaults", () => {
    parseFxFlags("?bloom=0");
    expect(DEFAULT_FX.bloom).toBe(true);
  });
  it("overrides each flag", () => {
    expect(parseFxFlags("?bloom=0").bloom).toBe(false);
    expect(parseFxFlags("?vignette=false").vignette).toBe(false);
    expect(parseFxFlags("?glow=off").glow).toBe(false);
    expect(parseFxFlags("?lights=on").lights).toBe(true);
    expect(parseFxFlags("?lights=1").lights).toBe(true);
    expect(parseFxFlags("?glow=true").glow).toBe(true);
  });
  it("fx=0 turns all off, then per-flag overrides apply", () => {
    expect(parseFxFlags("?fx=0")).toEqual({ bloom: false, vignette: false, glow: false, lights: false });
    expect(parseFxFlags("?fx=0&bloom=1")).toEqual({ bloom: true, vignette: false, glow: false, lights: false });
    expect(parseFxFlags("?bloom=1&fx=off")).toEqual({ bloom: true, vignette: false, glow: false, lights: false });
  });
  it("fx=1 turns all on", () => {
    expect(parseFxFlags("?fx=1")).toEqual({ bloom: true, vignette: true, glow: true, lights: true });
  });
  it("accepts odd casing", () => {
    expect(parseFxFlags("?BLOOM=OFF".replace("BLOOM", "bloom")).bloom).toBe(false);
    expect(parseFxFlags("?glow=FaLsE").glow).toBe(false);
    expect(parseFxFlags("?lights=On").lights).toBe(true);
  });
  it("ignores unknown params and values", () => {
    expect(parseFxFlags("?foo=0&bloom=maybe&debug")).toEqual(DEFAULT_FX);
  });
});
