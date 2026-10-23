import { describe, expect, it } from "vitest";
import sunnyMeadow from "../../public/assets/levels/sunny-meadow.tmj?raw";
import { LEVELS } from "./levels";
import { parseLevel } from "./parse";
import { levelFromRows, objectCell, parseTiledLevel, type TiledMap, type TiledObject, type TiledTileLayer, type TiledObjectLayer } from "./tiled";

function tiny(): TiledMap {
  return levelFromRows(["", "P  G", "####"]);
}
const terrainLayer = (m: TiledMap) => m.layers.find((l) => l.name === "terrain") as TiledTileLayer;
const objectLayer = (m: TiledMap) => m.layers.find((l) => l.name === "objects") as TiledObjectLayer;

describe("tiled round trip", () => {
  it.each(LEVELS.map((l, i) => [i + 1, l] as const))("Level %i", (_n, def) => {
    expect(parseTiledLevel(levelFromRows(def.rows))).toEqual(parseLevel(def.rows));
  });

  it("survives JSON serialization", () => {
    const m = JSON.parse(JSON.stringify(levelFromRows(LEVELS[1].rows)));
    expect(parseTiledLevel(m)).toEqual(parseLevel(LEVELS[1].rows));
  });
});

describe("sunny-meadow.tmj", () => {
  it("parses equal to LEVELS[0].rows", () => {
    expect(parseTiledLevel(JSON.parse(sunnyMeadow))).toEqual(parseLevel(LEVELS[0].rows));
  });
});

describe("parseTiledLevel", () => {
  it("strips flip bits from GIDs", () => {
    const m = tiny();
    const layer = terrainLayer(m);
    const flagged = layer.data.map((g) => (g ? (g | 0x80000000 | 0x40000000 | 0x20000000 | 0x10000000) >>> 0 : 0));
    layer.data = flagged;
    expect(parseTiledLevel(m)).toEqual(parseLevel(["", "P  G", "####"]));
  });

  it("accepts class as well as type", () => {
    const m = tiny();
    for (const o of objectLayer(m).objects) {
      o.class = o.type;
      delete o.type;
    }
    expect(parseTiledLevel(m)).toEqual(parseLevel(["", "P  G", "####"]));
  });

  it("throws on a GID without terrain property", () => {
    const m = tiny();
    terrainLayer(m).data[0] = 5;
    expect(() => parseTiledLevel(m)).toThrow(/no 'terrain' property/);
  });

  it("throws on an invalid terrain value", () => {
    const m = tiny();
    m.tilesets[0].tiles![0].properties![0].value = "lava";
    expect(() => parseTiledLevel(m)).toThrow(/invalid terrain/);
  });

  it("throws on unknown object type", () => {
    const m = tiny();
    objectLayer(m).objects.push({ id: 99, type: "dragon", x: 0, y: 0 });
    expect(() => parseTiledLevel(m)).toThrow(/unknown type/);
  });

  it("throws on missing start / goal", () => {
    const noStart = tiny();
    objectLayer(noStart).objects = objectLayer(noStart).objects.filter((o) => o.type !== "start");
    expect(() => parseTiledLevel(noStart)).toThrow(/start/);
    const noGoal = tiny();
    objectLayer(noGoal).objects = objectLayer(noGoal).objects.filter((o) => o.type !== "goal");
    expect(() => parseTiledLevel(noGoal)).toThrow(/goal/);
  });

  it("uses diamond ids matching the ASCII parser", () => {
    const rows = ["", " P d G", "#######"];
    const m = levelFromRows(rows);
    expect(parseTiledLevel(m).diamonds).toEqual([{ x: 3, y: 1, id: "3,1" }]);
  });
});

describe("objectCell", () => {
  it("tile objects are bottom-left anchored", () => {
    const o: TiledObject = { id: 1, x: 36, y: 54, width: 18, height: 18, gid: 68 };
    expect(objectCell(o)).toEqual({ x: 2, y: 2 }); // occupies y 36..54 -> row 2
  });

  it("point and rect objects are top-left anchored", () => {
    expect(objectCell({ id: 1, x: 36, y: 54, point: true })).toEqual({ x: 2, y: 3 });
    expect(objectCell({ id: 2, x: 36, y: 54, width: 18, height: 18 })).toEqual({ x: 2, y: 3 });
  });

  it("tolerates sub-tile offsets", () => {
    expect(objectCell({ id: 1, x: 40, y: 71, gid: 1 })).toEqual({ x: 2, y: 3 });
  });
});
