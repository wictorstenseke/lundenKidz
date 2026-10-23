/**
 * Tiled JSON (.tmj) support. A .tmj is parsed into the same ParsedLevel the ASCII parser makes,
 * so rendering (frame-based autotiling from Terrain[][]), collision and gameplay are unchanged.
 * Phaser's own Tiled loader is deliberately not used.
 *
 * Generate a .tmj from a hard-coded level (Vite SSR-loads the TS, no extra deps):
 *   node scripts/ascii-to-tmj.mjs <levelIndex> <out.tmj>
 *   e.g. node scripts/ascii-to-tmj.mjs 0 public/assets/levels/sunny-meadow.tmj
 *
 * Tiled map conventions: orthogonal, 18x18 tiles, uncompressed `data: number[]`.
 *   Tile layer "terrain": GID -> Terrain via embedded tileset tile property `terrain`.
 *   Object layer "objects": `type`/`class` is an ObjectKind (lanterns and light posts are point objects). Tile objects (with gid) have origin
 *   bottom-left; point/rect objects have origin top-left.
 */
import { parseLevel, type DecorKind, type EnemyKind, type ParsedLevel, type Terrain } from "./parse";

const TILE = 18;
/** Flip/rotate flags live in the top 4 bits of a GID. */
const GID_MASK = 0x0fffffff;

export type ObjectKind =
  | "start" | "goal" | "checkpoint" | "diamond" | "heart" | "spring" | "lantern" | "lightpost"
  | EnemyKind | DecorKind;

const OBJECT_KINDS: readonly string[] = [
  "start", "goal", "checkpoint", "diamond", "heart", "spring",
  "walker", "hopper", "spiky", "plant", "fence", "sign", "lantern", "lightpost",
];

export interface TiledProperty {
  name: string;
  type?: string;
  value: string | number | boolean;
}

export interface TiledTile {
  id: number;
  properties?: TiledProperty[];
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  columns: number;
  tilecount: number;
  margin: number;
  spacing: number;
  tiles?: TiledTile[];
}

export interface TiledTileLayer {
  type: "tilelayer";
  name: string;
  width: number;
  height: number;
  data: number[];
  id?: number;
  x?: number;
  y?: number;
  opacity?: number;
  visible?: boolean;
}

export interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  /** Tiled >= 1.9 */
  class?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Present on tile objects. */
  gid?: number;
  point?: boolean;
  rotation?: number;
  visible?: boolean;
}

export interface TiledObjectLayer {
  type: "objectgroup";
  name: string;
  objects: TiledObject[];
  id?: number;
  x?: number;
  y?: number;
  opacity?: number;
  visible?: boolean;
  draworder?: string;
}

export interface TiledMap {
  type?: "map";
  version?: string;
  tiledversion?: string;
  orientation: "orthogonal";
  renderorder?: string;
  infinite?: boolean;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  nextlayerid?: number;
  nextobjectid?: number;
  layers: (TiledTileLayer | TiledObjectLayer)[];
  tilesets: TiledTileset[];
}

const TERRAINS: readonly Terrain[] = ["ground", "block", "platform", "cloud"];

/** Cell containing a Tiled object. Tile objects are bottom-left anchored, others top-left. */
export function objectCell(o: TiledObject): { x: number; y: number } {
  const x = Math.floor(o.x / TILE);
  const y = o.gid !== undefined ? Math.floor((o.y - 1) / TILE) : Math.floor(o.y / TILE);
  return { x, y };
}

function terrainByGid(map: TiledMap): Map<number, Terrain> {
  const out = new Map<number, Terrain>();
  for (const ts of map.tilesets) {
    for (const tile of ts.tiles ?? []) {
      const prop = tile.properties?.find((p) => p.name === "terrain");
      if (!prop) continue;
      if (typeof prop.value !== "string" || !(TERRAINS as readonly string[]).includes(prop.value)) {
        throw new Error(`Tile ${tile.id} in tileset '${ts.name}' has invalid terrain '${String(prop.value)}'`);
      }
      out.set(ts.firstgid + tile.id, prop.value as Terrain);
    }
  }
  return out;
}

export function parseTiledLevel(map: TiledMap): ParsedLevel {
  if (map.orientation !== "orthogonal") throw new Error(`Unsupported Tiled orientation '${map.orientation}'`);
  if (map.tilewidth !== TILE || map.tileheight !== TILE) {
    throw new Error(`Tiled map must use ${TILE}x${TILE} tiles, got ${map.tilewidth}x${map.tileheight}`);
  }
  const terrainLayer = map.layers.find((l): l is TiledTileLayer => l.type === "tilelayer" && l.name === "terrain");
  if (!terrainLayer) throw new Error("Tiled map has no tile layer named 'terrain'");
  const objectLayer = map.layers.find((l): l is TiledObjectLayer => l.type === "objectgroup" && l.name === "objects");

  const width = map.width;
  const height = map.height;
  if (terrainLayer.data.length !== width * height) {
    throw new Error(`Layer 'terrain' has ${terrainLayer.data.length} cells, expected ${width * height}`);
  }

  const byGid = terrainByGid(map);
  const terrain: Terrain[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < width; x++) {
      const raw = terrainLayer.data[y * width + x];
      const gid = raw & GID_MASK;
      if (gid === 0) {
        row.push("empty");
        continue;
      }
      const t = byGid.get(gid);
      if (!t) throw new Error(`Tile GID ${gid} at ${x},${y} has no 'terrain' property`);
      row.push(t);
    }
    terrain.push(row);
  }

  let start: ParsedLevel["start"] | undefined;
  let goal: ParsedLevel["goal"] | undefined;
  const level: ParsedLevel = {
    width,
    height,
    terrain,
    start: undefined as never,
    goal: undefined as never,
    checkpoints: [],
    diamonds: [],
    heartPickups: [],
    enemies: [],
    springs: [],
    decor: [],
    lanterns: [],
  };

  for (const o of objectLayer?.objects ?? []) {
    const kind = o.class || o.type || "";
    if (!OBJECT_KINDS.includes(kind)) {
      throw new Error(`Object ${o.id} has unknown type '${kind}'`);
    }
    const { x, y } = objectCell(o);
    if (x < 0 || y < 0 || x >= width || y >= height) {
      throw new Error(`Object ${o.id} ('${kind}') is outside the map at ${x},${y}`);
    }
    const cell = { x, y };
    switch (kind) {
      case "start": start = cell; break;
      case "goal": goal = cell; break;
      case "checkpoint": level.checkpoints.push(cell); break;
      case "diamond": level.diamonds.push({ ...cell, id: `${x},${y}` }); break;
      case "heart": level.heartPickups.push(cell); break;
      case "spring": level.springs.push(cell); break;
      case "lantern": level.lanterns.push({ ...cell, kind: "lantern" }); break;
      case "lightpost": level.lanterns.push({ ...cell, kind: "post" }); break;
      case "walker":
      case "hopper":
      case "spiky": level.enemies.push({ ...cell, kind }); break;
      case "plant":
      case "fence":
      case "sign": level.decor.push({ ...cell, kind }); break;
    }
  }

  if (!start) throw new Error("Level has no start object");
  if (!goal) throw new Error("Level has no goal object");
  level.start = start;
  level.goal = goal;
  return level;
}

/** Real Kenney tile-sheet frames (grass theme) used so the map looks right in Tiled. */
const TERRAIN_FRAME: Record<Exclude<Terrain, "empty">, number> = {
  ground: 22, // THEMES.grass.groundTop middle
  block: 26, // THEMES.grass.block
  platform: 49, // tiles.ts PLATFORM middle
  cloud: 154, // tiles.ts CLOUD middle
};

/** Visible tile frame per object kind; kinds without one become point objects. */
const OBJECT_FRAME: Partial<Record<ObjectKind, number>> = {
  diamond: 67,
  heart: 44,
  goal: 111,
  spring: 107,
  fence: 106,
  sign: 85,
  plant: 125,
};

/** Inverse of parseTiledLevel: ASCII rows (parse.ts legend) to a Tiled map. */
export function levelFromRows(rows: string[]): TiledMap {
  const level = parseLevel(rows);
  const { width, height } = level;

  const firstgid = 1;
  const gidOf = (frame: number) => firstgid + frame;
  const data: number[] = [];
  const usedTerrain = new Map<number, Terrain>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = level.terrain[y][x];
      if (t === "empty") {
        data.push(0);
        continue;
      }
      const frame = TERRAIN_FRAME[t];
      usedTerrain.set(frame, t);
      data.push(gidOf(frame));
    }
  }

  const tiles: TiledTile[] = [...usedTerrain.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, t]) => ({ id, properties: [{ name: "terrain", type: "string", value: t }] }));

  const objects: TiledObject[] = [];
  let nextId = 1;
  const add = (kind: ObjectKind, cell: { x: number; y: number }) => {
    const frame = OBJECT_FRAME[kind];
    if (frame !== undefined) {
      // Tile object: origin bottom-left.
      objects.push({
        id: nextId++, name: "", type: kind, x: cell.x * TILE, y: (cell.y + 1) * TILE,
        width: TILE, height: TILE, gid: gidOf(frame), rotation: 0, visible: true,
      });
    } else {
      objects.push({
        id: nextId++, name: kind, type: kind, x: cell.x * TILE, y: cell.y * TILE,
        width: 0, height: 0, point: true, rotation: 0, visible: true,
      });
    }
  };

  // Row-major so the parser reproduces the ASCII parser's ordering.
  type Item = { kind: ObjectKind; x: number; y: number };
  const items: Item[] = [
    { kind: "start", ...level.start },
    { kind: "goal", ...level.goal },
    ...level.checkpoints.map((c) => ({ kind: "checkpoint" as const, ...c })),
    ...level.diamonds.map((c) => ({ kind: "diamond" as const, x: c.x, y: c.y })),
    ...level.heartPickups.map((c) => ({ kind: "heart" as const, ...c })),
    ...level.springs.map((c) => ({ kind: "spring" as const, ...c })),
    ...level.enemies.map((c) => ({ kind: c.kind, x: c.x, y: c.y })),
    ...level.decor.map((c) => ({ kind: c.kind, x: c.x, y: c.y })),
    ...level.lanterns.map((c) => ({ kind: c.kind === "post" ? ("lightpost" as const) : ("lantern" as const), x: c.x, y: c.y })),
  ];
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of items) add(it.kind, it);

  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.10.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    width,
    height,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: 3,
    nextobjectid: nextId,
    layers: [
      { id: 1, name: "terrain", type: "tilelayer", x: 0, y: 0, width, height, opacity: 1, visible: true, data },
      { id: 2, name: "objects", type: "objectgroup", x: 0, y: 0, opacity: 1, visible: true, draworder: "topdown", objects },
    ],
    tilesets: [
      {
        firstgid,
        name: "tiles",
        image: "../kenney/tiles.png",
        imagewidth: 360,
        imageheight: 162,
        tilewidth: TILE,
        tileheight: TILE,
        columns: 20,
        tilecount: 180,
        margin: 0,
        spacing: 0,
        tiles,
      },
    ],
  };
}
