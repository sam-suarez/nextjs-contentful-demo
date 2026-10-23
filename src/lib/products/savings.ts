import "server-only";

/**
 * Whole-number percent a member saves against the everyday price (D-036).
 * `null` when there is no everyday price to compare against, or when the
 * rounded saving is 0 or less (equal prices, member price higher, under 0.5%).
 */
export function savingsPercent(everydayPrice: number, memberPrice: number): number | null {
  if (everydayPrice <= 0) return null;
  const percent = Math.round((1 - memberPrice / everydayPrice) * 100);
  return percent > 0 ? percent : null;
}
