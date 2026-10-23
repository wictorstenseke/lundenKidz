import { defaultOutfit, type Outfit } from "./logic/outfits";
import type { SpriteKind } from "./objects/sprites";

export interface CharacterDef {
  id: string;
  name: string;
  /** Cut-out head (transparent PNG) under public/kids/. */
  photo: string;
  /** Which pixel body (and bike rider) the Character uses. */
  sprite: SpriteKind;
  shirt: number;
  pants: number;
}

// Rename and recolour freely; the photo files are swapped in public/kids/.
export const CHARACTERS: CharacterDef[] = [
  { id: "ellen", name: "Ellen", photo: "kids/ellen.png", sprite: "girl", shirt: 0xe84a5f, pants: 0x2a4d8f },
  { id: "emil", name: "Emil", photo: "kids/emil.png", sprite: "boy", shirt: 0x3fa34d, pants: 0x5a3d2b },
  { id: "olle", name: "Olle", photo: "kids/olle.png", sprite: "boy", shirt: 0xf2a541, pants: 0x6b3fa0 },
];

export function spriteKindOf(id: string): SpriteKind {
  return CHARACTERS.find((c) => c.id === id)?.sprite ?? "boy";
}

/** Outfits each Character has worn this session, oldest first; the default is always the first. */
const outfits = new Map<string, Outfit[]>(CHARACTERS.map((c) => [c.id, [defaultOutfit(c.shirt, c.pants)]]));

export function getOutfit(id: string): Outfit {
  const worn = outfits.get(id)!;
  return worn[worn.length - 1];
}

/** Puts on a new outfit, remembering the previous ones. */
export function wearOutfit(id: string, outfit: Outfit): void {
  outfits.get(id)!.push(outfit);
}

/** Goes back to the previously worn outfit; returns it, or undefined when already at the default. */
export function wearPreviousOutfit(id: string): Outfit | undefined {
  const worn = outfits.get(id)!;
  if (worn.length < 2) return undefined;
  worn.pop();
  return worn[worn.length - 1];
}
