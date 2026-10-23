// Usage: node scripts/ascii-to-tmj.mjs <levelIndex> <out.tmj>
// Loads the TS sources through Vite's SSR loader (no extra deps).
import { createServer } from "vite";
import { writeFileSync } from "node:fs";

const [idx, out] = process.argv.slice(2);
if (idx === undefined || !out) {
  console.error("usage: node scripts/ascii-to-tmj.mjs <levelIndex> <out.tmj>");
  process.exit(1);
}
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { LEVELS } = await server.ssrLoadModule("/src/levels/levels.ts");
  const { levelFromRows } = await server.ssrLoadModule("/src/levels/tiled.ts");
  const def = LEVELS[Number(idx)];
  if (!def) throw new Error(`No level at index ${idx}`);
  writeFileSync(out, JSON.stringify(levelFromRows(def.rows), null, 2) + "\n");
  console.log(`wrote ${out} (${def.name})`);
} finally {
  await server.close();
}
