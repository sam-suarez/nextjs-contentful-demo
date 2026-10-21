// Copy and number helpers. Plain isomorphic TypeScript: each helper returns one string,
// so React renders it as one text node and the HTML contains it verbatim (spec P03 R9).

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const LOGGED_OUT_BANNER_TEXT =
  "You're seeing everyday prices. Sign in to unlock member prices and members-only toys.";

/** "$11.20", "$9.00", "$1,234.50". */
export function formatPrice(amount: number): string {
  return usd.format(amount);
}

/** "1 toy", "0 toys", "8 toys". */
export function formatToyCount(n: number): string {
  return `${n} ${n === 1 ? "toy" : "toys"}`;
}

/** Logged-in banner sentence; the count is the number of members-only products before filtering. */
export function memberBannerText(membersOnlyCount: number): string {
  if (membersOnlyCount <= 0) return "Member prices are on.";
  const noun = membersOnlyCount === 1 ? "toy" : "toys";
  return `Member prices are on. You're also seeing ${membersOnlyCount} members-only ${noun}.`;
}

/** Empty-state body: a search hint when `q` is set, else the category message. */
export function emptyStateMessage(q: string): string {
  return q.trim() !== "" ? "Try a different word or category." : "No toys in this category yet.";
}
