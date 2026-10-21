# Phase 02: Human check

**Status:** closed (commit `feat(data): phase 02 - data layer`; run `git log -1 --oneline` for the sha)
**Result:** PASSED (recorded at the start of the phase 03 thread, 2026-10-20)

## Escalation

none. One spec interpretation you may want to confirm (spec Contract decisions, "requires-login"): for a logged-out visitor asking for a Set B slug, `getProductBySlug` looks the slug up in the authenticated set so it can answer `requires-login` instead of `not-found`. D-014 literally says logged-out requests "only ever query `public`". The lookup is reduced to `{ status: "requires-login" }` with no product data (R13, `src/lib/dal.ts` around line 63). If you'd rather reword D-014 ("never return" instead of "never query"), that's your edit, because the orchestrator can't touch `docs/decisions.md`.

## Verify it yourself (about 10 minutes)

Run from the repo root. There are still no pages (the catalog arrives in P03), so the checks are unit tests, a read-through and one live Contentful query.

1. `npm test`. Expect: `Test Files  11 passed (11)` and `Tests  251 passed (251)` (109 from P01 + 142 new).
2. `npm run typecheck && npm run lint && scripts/check-client-boundary.sh`. Expect: exit 0 and `OK: client boundary respected`.
3. `env SESSION_SECRET= CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= npm run build`. Expect: success; routes `/` and `/_not-found`. (No route imports `dal.ts` yet, so this build does not compile `"use cache"`. P03's build does.)
4. Live query shape, against your real space (read-only, prints no secrets):
   ```sh
   node --env-file=.env.local -e 'import("contentful").then(async({createClient})=>{const c=createClient({space:process.env.CONTENTFUL_SPACE_ID,environment:process.env.CONTENTFUL_ENVIRONMENT,accessToken:process.env.CONTENTFUL_DELIVERY_TOKEN});for(const s of ["public","public,authenticated"]){const r=await c.withoutUnresolvableLinks.getEntries({content_type:"product","fields.visibility[in]":s,order:["fields.name"]});console.log(s,"->",r.total,r.items[1].fields.image.fields.file.url.slice(0,24))}})'
   ```
   Expect: `public -> 8 //images.ctfassets.net/` and `public,authenticated -> 12 //images.ctfassets.net/`. This is the exact query `src/lib/products/contentful-adapter.ts` sends. The orchestrator ran it before committing and got these results.
5. Read `src/lib/dal.ts` (65 lines). Check that:
   - `fetchProducts` is not exported, and starts with `"use cache"; cacheLife("hours"); cacheTag("products");`.
   - It is only ever called with `["public"]` or `["public", "authenticated"]`, and it never touches `cookies()`.
   - A logged-out visitor only gets `toCatalogProduct(…, "everyday")`.
   - The Set B lookup for `requires-login` only uses `.some(...)`.
6. Read `src/lib/products/to-catalog-product.ts` (39 lines). Check: the returned object has one `price` and a `priceTier`, never both prices, and `//` URLs get `https:`.
7. Read `src/lib/products/source.ts` (27 lines). Check: the log line prints only `mock` or `contentful`, never an env value.
8. View source and JS-disabled browser checks: n/a this phase (no rendered routes changed).

Two notes carried to P03 (STATE.md phase notes):
- `alt` is `description ?? title`, so an empty-string description gives `alt: ""`. The current data has descriptions on every asset.
- The `[products] source: …` line logs on the first cache miss, not at server start.

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>` (for example `/phase PASSED`). Or paste the prompt below, after filling in its `Human check:` line. `/phase` also turns on the orchestrator's path guard (D-029). This thread was started by pasting, so the guard was off.

```
You are the orchestrator. Follow agents/orchestrator.md exactly.
Read handoffs/STATE.md first.
Last completed: Phase 02 data layer (commit <sha from git log -1 --oneline>).
Human check for phase 02: <PASSED | FAILED: what you saw | FIXED MANUALLY: what you changed, commit sha>
Next: Phase 03 catalog, builder ui.
```
