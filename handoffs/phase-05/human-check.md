# Phase 05: Human check

**Status:** closed (commit `f7dff1f`)
**Result:** DEFERRED (batch run)

## Escalation

none (the only e2e failure is the P04 R17 known failure, OI-1)

## Verify it yourself (about 10 minutes)

Run from the repo root.

1. `npm run build`. Expect: `ƒ /`, `ƒ /login`, `◐ /products/[slug]`, with no Suspense or `useSearchParams` error.
2. `scripts/verify-ssr.sh`. Expect: `verify-ssr: 551 passed, 0 failed`.
3. `npm run test:e2e`. Expect: `16 passed, 1 failed`. The one failure is `e2e/login.spec.ts` R17 (OI-1).
4. `npm start`, then open `http://localhost:3000/` in a browser. Click **Specs first**. Expect: the cards switch to horizontal spec rows with the price last, the URL becomes `/?layout=specs`, there is no page reload (the Network tab shows no document request), and **Back** does not step through layouts (replaceState). Click **Price first**: the URL goes back to `/`.
5. On `/?q=washable`, toggle. Expect: `/?q=washable&layout=specs`.
6. Known limitation: toggle to Specs first, then click the **Bath** chip. Expect: `/?category=bath` in **Price first**. The chips keep their server hrefs from before the toggle. Decide whether that is acceptable (spec Contract decisions).
7. Keyboard: Tab to the layout options. Expect: a visible focus ring, and Enter toggles. Space doesn't, because the options are `<a role="button">` (reviewer note).
8. JS disabled (DevTools → Command menu → "Disable JavaScript"): on `/`, click **Specs first**. Expect: a real navigation to `/?layout=specs`, specs layout, prices visible, and "Specs first" shown as active.
9. View source of `/?layout=specs`. Expect: exactly one `data-layout="specs"`, `aria-current="true"` on "Specs first", and no `aria-pressed` anywhere.

## Continue in a new thread

```
/phase PASSED
```
(or `FAILED: <what you saw>`); in the batch run, phase 06 starts straight after this one.
