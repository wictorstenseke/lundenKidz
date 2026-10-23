import { describe, expect, it } from "vitest";
import { landedOn, resolveContact } from "./contact";

const base = { playerPrevBottom: 100, playerVelocityY: 120, enemyTop: 100, stompable: true };

describe("resolveContact", () => {
  it("is a Stomp when falling onto a stompable Enemy from above", () => {
    expect(resolveContact(base)).toBe("stomp");
  });

  it("tolerates a few pixels of overlap from the previous frame", () => {
    expect(resolveContact({ ...base, playerPrevBottom: 104 })).toBe("stomp");
  });

  it("hurts when walking into an Enemy from the side", () => {
    expect(resolveContact({ ...base, playerPrevBottom: 118, playerVelocityY: 0 })).toBe("hurt");
  });

  it("hurts when jumping up into an Enemy", () => {
    expect(resolveContact({ ...base, playerVelocityY: -200 })).toBe("hurt");
  });

  it("hurts when landing on a Spiky", () => {
    expect(resolveContact({ ...base, stompable: false })).toBe("hurt");
  });
});

describe("landedOn", () => {
  it("is true when falling onto the top", () => expect(landedOn(100, 50, 100)).toBe(true));
  it("is false when rising or coming from the side", () => {
    expect(landedOn(100, -50, 100)).toBe(false);
    expect(landedOn(115, 50, 100)).toBe(false);
  });
});
