import "server-only";

export type ProductSource = "contentful" | "mock";

const CONTENTFUL_VARS = [
  "CONTENTFUL_SPACE_ID",
  "CONTENTFUL_ENVIRONMENT",
  "CONTENTFUL_DELIVERY_TOKEN",
] as const;

/** Pure (R1). No logging, no process.env access. Missing, "" and whitespace-only all count as unset. */
export function selectProductSource(env: Readonly<Record<string, string | undefined>>): ProductSource {
  const allSet = CONTENTFUL_VARS.every((name) => (env[name]?.trim() ?? "") !== "");
  return allSet ? "contentful" : "mock";
}

let activeSource: ProductSource | undefined;

/** selectProductSource(process.env), memoized per module; logs one console.info line on first call (R2). */
export function getProductSource(): ProductSource {
  if (activeSource === undefined) {
    activeSource = selectProductSource(process.env);
    // Prints only the source name, never an env value.
    console.info(`[products] source: ${activeSource}`);
  }
  return activeSource;
}
