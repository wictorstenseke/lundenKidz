export const DIAMONDS_PER_HEART = 100;

export function collectDiamond(total: number): { total: number; heartEarned: boolean } {
  const next = total + 1;
  return { total: next, heartEarned: next % DIAMONDS_PER_HEART === 0 };
}
