# Phase 02: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/lib/products/source.ts:12-15 (`CONTENTFUL_VARS.every((name) => (env[name]?.trim() ?? "") !== "")`, only reads the `env` argument, no logging); tests src/lib/products/source.test.ts cover all-set, each var missing/""/"  ", `{}`, .env.example shape | |
| R2 | PASS | src/lib/products/source.ts:17-26 (module-level `activeSource`, `selectProductSource(process.env)` on first call only, `console.info(\`[products] source: ${activeSource}\`)` at :24, where the value can only be "mock" or "contentful"). The diff has no other `console.*` call in non-test code | |
| R3 | PASS | src/lib/products/mock-adapter.ts:7-12 (`productCollectionSchema.parse(mockData)`, `filter(sets.includes(visibility))`, `sort(localeCompare(…, "en"))`, URLs not touched, no `contentful` import) | |
| R4 | PASS | src/lib/products/contentful-adapter.ts:3 (named `createClient` import); :13-17 (exactly `{ space, environment, accessToken }`, trimmed `process.env` values read at call time); :19-23 (one `withoutUnresolvableLinks.getEntries` call with exactly `content_type`, `"fields.visibility[in]": sets.join(",")`, `order: ["fields.name"]`) | |
| R5 | PASS | src/lib/products/contentful-adapter.ts:25 (`productCollectionSchema.parse(response)`, no try/catch, no fallback); :26 returns `items` | |
| R6 | PASS | src/lib/products/contentful-adapter.ts:26 (`items.filter((entry) => sets.includes(entry.fields.visibility))`, which keeps the API's order) | |
| R7 | PASS | src/lib/products/to-catalog-product.ts:23-38 (literal object with exactly the 12 keys; `id: entry.sys.id`; `features: [...(f.features ?? [])]` at :34; `price: tier === "member" ? priceAuthenticated : priceLoggedOut` at :36; `priceTier: tier` at :37) | |
| R8 | PASS | src/lib/products/to-catalog-product.ts:7-9 (`startsWith("//") ? \`https:${url}\` : url`); :11-20 (`null` when there is no asset; `alt: description ?? title`; width/height `?? null` from `file.details.image`) | |
| R9 | PASS | src/lib/dal.ts:4 (`cookies` from `next/headers`); :5 (`cache` from `react`); :21-24 (`cache(async () => …)`, `(await cookies()).get(SESSION_COOKIE)?.value`, `return verifySessionToken(token)`); :12 imports `verifySessionToken` from `@/lib/session`; no `jose` import anywhere in the diff | |
| R10 | PASS | src/lib/dal.ts:44-45 (no session: `fetchProducts(["public"])` mapped with `toCatalogProduct(entry, "everyday")`); order comes from mock-adapter.ts:11; key set from to-catalog-product.ts:25-38 (no `priceAuthenticated`) | |
| R11 | PASS | src/lib/dal.ts:40-43 (session: `fetchProducts(["public", "authenticated"])` mapped with `"member"`); one sorted list, so Set B is mixed in by name (mock-adapter.ts:11) | |
| R12 | PASS | src/lib/dal.ts:50 (`!SLUG_PATTERN.test(slug)` returns not-found before any session read or fetch); :52-56 (session: exact `===` slug match in the full set, found as member or not-found, never requires-login); :58-59 (no session: public set, found as everyday); :63-64 (Set B lookup reduced to requires-login or not-found) | |
| R13 | PASS | src/lib/dal.ts:50, :55, :64 return the literal objects `{ status: "not-found" }` / `{ status: "requires-login" }` with no other keys; the Set B lookup at :63 uses only `.some(...)`, and nothing from it is mapped, returned or logged | |
| R14 | PASS | src/lib/dal.ts:3 (`cacheLife`, `cacheTag` named imports from `next/cache`); :30 (`async function fetchProducts(sets)`, not exported, one parameter); :31 `"use cache";` is the first statement, then :32 `cacheLife("hours")`, :33 `cacheTag("products")`, :34 the source ternary; no `cookies()`/`verifySession()` inside; called only with literal `["public"]` (:44, :58) or `["public", "authenticated"]` (:41, :54, :63) | |
| R15 | PASS | src/lib/dal.ts:15 (`ProductBySlugResult`), :21 (`verifySession`, no params), :38 (`getProducts()`), :49 (`getProductBySlug(slug: string)`); dal.ts has no other `export` | |
| R16 | PASS | src/lib/products/filter.ts:18-27 (`products.filter(...)` gives a new array in input order and does not mutate; category used only when truthy and in `KNOWN_CATEGORIES` (:9, :19); `needle = (q ?? "").trim().toLowerCase()` (:20), empty means no text filter; AND of both conditions (:24-25)); :11-15 matches name, description and features, lower-cased | |
| R17 | PASS | Line 1 is `import "server-only";` in all 13 new files: src/lib/dal.ts:1, src/lib/dal.test.ts:1, src/lib/products/{types,source,source.test,mock-adapter,mock-adapter.test,contentful-adapter,contentful-adapter.test,to-catalog-product,to-catalog-product.test,filter,filter.test}.ts:1. No file-level `"use server"`/`"use client"` in the diff (the only directive is the function-level `"use cache"` at dal.ts:31) | |
| R18 | PASS | The diff has only 13 files (7 data-auth owned + 6 qa owned under src/lib/**). No package.json, lockfile, .env.example, src/schemas/** or src/data/** hunks. No `NEXT_PUBLIC_` anywhere in the diff | |
| R19 | PASS | src/lib/products/contentful-adapter.test.ts:12 (`vi.mock("contentful", …)`); src/lib/dal.test.ts:28 (`contentful` mocked with a throwing `createClient`) and :135-137 (the three `CONTENTFUL_*` vars stubbed to `""` in `beforeEach`); src/lib/products/mock-adapter.test.ts also mocks `contentful`; source, filter and to-catalog-product tests never reach the live adapter | |
| G1 | PASS | Every file in the diff is in the spec's Owned paths (data-auth: dal.ts and the six src/lib/products/*.ts; qa: the six *.test.ts) | |
| G2 | PASS | No `'use client'` anywhere in the diff | |
| G3 | PASS | No `<Suspense>` or `loading.tsx` in the diff; no src/app or src/components changes | |
| G4 | PASS | No `NEXT_PUBLIC_` reads. The only log is src/lib/products/source.ts:24, which prints only the source name. `CONTENTFUL_*` are read only in server-only src/lib/products/contentful-adapter.ts:14-16. No change to the session payload | |
| G5 | PASS | See R17: all new src/lib/** files start with `import "server-only";` | |
| G6 | PASS | No client islands added or changed in this diff (nothing under src/components/client/) | |

Overall: PASS

Notes:
- src/lib/dal.ts:23 passes `string | undefined` to `verifySessionToken`. That is correct only if the P01 signature accepts `undefined`. I can't see it from the diff; `npm run typecheck` (qa) settles it.
- src/lib/dal.ts:50 calls `SLUG_PATTERN.test(slug)`. If `SLUG_PATTERN` in src/schemas/product.ts had a `g` or `y` flag, `.test` would keep state between calls (`lastIndex`). The schema is outside the diff, so I couldn't check; mentioned only as a possible risk.
- src/lib/products/to-catalog-product.ts:16 uses `description ?? title`, as specified. An empty-string description gives `alt: ""` and does not fall back to the title. That matches the spec's wording, but P03 may want the fallback for `""` too.
- Under real Next, the one-time `console.info` at source.ts:24 runs inside the `"use cache"` scope of `fetchProducts`, so it fires on the first cache miss per server instance, not at startup. That still meets "once per module", and P03's build is the first real compile of the `"use cache"` transform, as the spec says.

Where the instructions got in the way: The reviewer's "never open" list covers `src/` while the spec includes facts from outside the diff (P01's `verifySessionToken` signature, `SLUG_PATTERN`'s definition, the mock data used in the expected-results table). The spec allows trusting those, and I judged the requirements against the code in the diff, leaving the data-dependent outcomes to qa's tests. Otherwise none.

**Orchestrator decision:** close. All R1–R19 and G1–G6 PASS in round 1. On the reviewer's notes: P01's contract types `verifySessionToken(token: string | undefined)` and qa's typecheck passed; `SLUG_PATTERN` in `src/schemas/product.ts` is `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` with no `g`/`y` flag. The empty-description `alt` and the log-on-first-cache-miss timing are carried into the P03 phase notes in STATE.md.
