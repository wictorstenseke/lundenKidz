/** Visual-effect toggles. Override via URL: ?bloom=0 ?vignette=1 ?glow=off ?lights=0 ?fx=0 (all off first). */
export interface FxFlags {
  bloom: boolean;
  vignette: boolean;
  glow: boolean;
  lights: boolean;
}

export const DEFAULT_FX: FxFlags = { bloom: true, vignette: true, glow: true, lights: true };

const KEYS: (keyof FxFlags)[] = ["bloom", "vignette", "glow", "lights"];

function parseBool(raw: string | null): boolean | undefined {
  if (raw === null) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "on") return true;
  if (v === "0" || v === "false" || v === "off") return false;
  return undefined;
}

/** Pure: `?fx=` sets all flags first, then per-flag params override. Unknown params/values ignored. */
export function parseFxFlags(search: string, defaults: FxFlags = DEFAULT_FX): FxFlags {
  const params = new URLSearchParams(search);
  const flags = { ...defaults };
  const all = parseBool(params.get("fx"));
  if (all !== undefined) for (const k of KEYS) flags[k] = all;
  for (const k of KEYS) {
    const v = parseBool(params.get(k));
    if (v !== undefined) flags[k] = v;
  }
  return flags;
}

/** Live flags the game reads. */
export const FX: FxFlags = parseFxFlags(typeof location !== "undefined" ? location.search : "");
