# Phase 03: Human check

**Status:** closed (commit `feat(catalog): phase 03 - catalog`; run `git log -1 --oneline` for the sha)
**Result:** PASSED

## Escalation

none. Round 1 review returned REVISE on R31 (focus styles were overridden). ui fixed it in round 2 and the round 2 review passed everything. Three things are worth your eye:

- **Lockfile:** `npm install lucide-react@1.55.0` also changed `"dev": true` to `"devOptional": true` on `@types/react` and `csstype` in `package-lock.json`, because lucide-react has an optional peer dependency on `@types/react`. Versions and hashes are unchanged. The reviewer accepted this as part of the lucide-react change. If you read R1 strictly, it's a one-line FAILED note.
- **Title-area overlap:** the reviewer could not rule out the decoration panel overlapping the title text at widths just above `md`, around 768px (step 4).
- **Spec choices against design.md** (all in `handoffs/phase-03/spec.md`, Contract decisions):
  - Each page renders `<main>`, not the root layout.
  - "Price first" links to the URL without `layout` (canonical) instead of `?layout=price`.
  - The banner sentence has no link in it.
  - Image `alt` is the product name.

## Verify it yourself (about 10 minutes)

Run from the repo root.

1. `npm test && npm run typecheck && npm run lint && scripts/check-client-boundary.sh`. Expect `Test Files  14 passed (14)`, `Tests  305 passed (305)`, then exit 0 and `OK: client boundary respected`.
2. `scripts/verify-ssr.sh`. It builds, starts a server on :3210, and stops it at the end; this takes about a minute and needs network for the Google fonts. Expect `262 passed, 0 failed` and exit 0. It runs on mock data with its own `SESSION_SECRET` and a self-minted cookie for `ssr-checker`.
3. Start a local server on mock data:
   ```sh
   rm -rf .next && env CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= SESSION_SECRET=0123456789abcdef0123456789abcdef npm run build && env CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= SESSION_SECRET=0123456789abcdef0123456789abcdef npm start
   ```
   Delete `.next` first: ui saw stale scaffold CSS once from Turbopack's cache. The server log should print `[products] source: mock` on the first request. Leaving the `CONTENTFUL_*` vars out uses your `.env.local` and live Contentful instead.
4. Browser, logged out, `http://localhost:3000/`. Expect:
   - cream dot-grid page, Outfit headings, and the "Tiny Confetti" logo with a **Sign in** button
   - the banner "You're seeing everyday prices…"
   - "Toy catalog" with a pink squiggle, and confetti on the right from `md` up
   - the filter card, showing **8 toys**
   - 8 cards with "Everyday price", for example Cloud Bunny Plush at $28.00
   - Bubble Bath Whale showing "Picture coming soon"
   - no "Members only" badge

   Then:
   - Narrow the window to about 768px and check that the decoration never covers the title or tagline.
   - Tab through the page: every button, chip, layout link and the search input should show a violet outline plus a hard violet shadow.
5. Filters: click **Bath**. The URL becomes `/?category=bath` and you see 2 toys. Search `washable` and the URL keeps `category=bath`, giving 0 toys and the empty state "Try a different word or category." Click **Clear filters** to return to `/`. Click **Specs first**: the URL becomes `?layout=specs` and the cards turn horizontal, with Age range / Material / Highlight rows and the price last. **Activity & Sensory** while logged out shows "No toys in this category yet."
6. Logged in: there's no login page yet (P04). Mint a cookie in DevTools. In a terminal, run:
   ```sh
   node -e 'import("jose").then(async({SignJWT})=>console.log(await new SignJWT({name:"Sam"}).setProtectedHeader({alg:"HS256"}).setExpirationTime("1h").sign(new TextEncoder().encode("0123456789abcdef0123456789abcdef"))))'
   ```
   In DevTools → Application → Cookies, add `session` = that token for `localhost`, then reload. Expect:
   - the "Member pricing" badge and "Signed in as **Sam**"
   - the banner "Member prices are on. You're also seeing 4 members-only toys."
   - **12 toys**, with Forest Friends Activity Cube third and showing a pink "Members only" badge and pink shadow
   - every price labelled "Member price" in violet, for example Cloud Bunny at $22.40

   Click **Sign out**: you return to `/`, logged out.
7. JS disabled (DevTools → Command menu → "Disable JavaScript"): repeat steps 4 and 5. Prices, filters, layout links and Sign out must all still work, because they're plain links and forms.
8. View source on `/` with the cookie set: search for `Member price` and `Forest Friends`. Expect them inside normal `<article>` markup, with no `<div hidden id="S:` and no `<!--$?-->`. Without the cookie, `Forest Friends` and `$22.40` are absent.

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>` (for example `/phase PASSED`). Or paste the prompt below, after filling in its `Human check:` line. `/phase` also turns on the orchestrator's path guard (D-029). This thread was started by pasting, so the guard was off.

```
You are the orchestrator. Follow agents/orchestrator.md exactly.
Read handoffs/STATE.md first.
Last completed: Phase 03 catalog (commit <sha from git log -1 --oneline>).
Human check for phase 03: <PASSED | FAILED: what you saw | FIXED MANUALLY: what you changed, commit sha>
Next: Phase 04 detail + login, builder ui.
```
