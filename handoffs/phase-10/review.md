# Phase 10: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/components/price.tsx:21 adds the required `savingsPercent: number \| null` prop. price.tsx:31-37 always renders `<div data-savings-row>` straight after the `data-price-amount` span, inside the `PRICE_STACK` block. | |
| R2 | PASS | price.tsx:25,36 renders `SavingsBadge` only when the tier is `"member"` and the value isn't null, otherwise the row stays empty. badge.tsx:25 renders the single `{formatSavings(percent)}` expression, so it is one text node. format.ts:23 returns `` `You save ${percent}%` `` and format.test.ts:94-108 covers 20/5/100. | |
| R3 | PASS | badge.tsx:24 uses `${BADGE} bg-quaternary text-foreground` with no icon. `BADGE` (badge.tsx:5-6) is the shared pill: rounded-full, border-2 border-foreground, text-label, font-bold. | |
| R4 | PASS | ui-classes.ts:108 exports `PRICE_SAVINGS_ROW = "flex h-7 items-center"`, a fixed `h-*`. It is used only at price.tsx:35 and skeletons.tsx:86, and nowhere else hard-codes the height. The pill is about 27.2 px (0.8rem text at the inherited 1.5 line-height, plus 2 px padding and 2 px border top and bottom), so it fits the 28 px row. e2e/savings.spec.ts:187-192 checks the fit. | |
| R5 | PASS | skeletons.tsx:86 adds an empty `<span aria-hidden="true" className={PRICE_SAVINGS_ROW} />` to `PriceSkeleton`. That is used by every `CardSkeleton` (skeletons.tsx:125, rendered 8 times at :173-175) and by the detail price card (skeletons.tsx:210). It has no text and no data-* hooks. | |
| R6 | PASS | product-card.tsx:55 and src/app/products/[slug]/page.tsx:113 pass `product.savingsPercent`. A Grep of src finds `@/lib/products/savings` imported only in src/lib/products/to-catalog-product.ts and its test; no component or page computes a percent. | |
| R7 | PASS | price.tsx:31 wraps the amount and the row in `flex flex-col group-data-[layout=specs]:items-end`. That right-aligns them in Specs first and leaves them stretched and left-aligned in Price first. Price is still rendered once per card (product-card.tsx:52-57, moved with `order-*`). e2e/savings.spec.ts:224-230 checks both alignments. | |
| R8 | PASS | scripts/verify-ssr.sh (diff +365-395) checks for `You save 20%` with a session on `/`, both detail slugs and `/?layout=specs`. It checks for no `You save` without a session on `/`, `/?layout=specs`, `/products/cloud-bunny-plush`, `/login` and the bad-cookie case. The page names it uses all exist (verify-ssr.sh:377-415). | |
| R9 | PASS | e2e/savings.spec.ts:194-232 and :275-288 cover both viewports, both layouts and the detail page. They check that the pill's top is at or below the amount's bottom (:183) and that, in Specs first, the right edges are within 2 px (:226). | |
| R10 | PASS | Both detail states render the same always-present row (page.tsx:113, price.tsx:35), and `DETAIL_PRICE_CARD` (ui-classes.ts:131) has no fixed height. e2e/savings.spec.ts:290-298 compares the card height signed out and signed in within 1 px, at both viewports. | |
| R11 | PASS | The diff edits no existing e2e spec. The skeleton price block mirrors the real one (label, amount and the same `PRICE_SAVINGS_ROW`, skeletons.tsx:81-88), so the swap adds no shift. Whether the existing checks pass is for qa's run. | |
| R12 | PASS | No `'use client'` is added. src/components/client/layout-toggle.tsx is not in the diff, so it gets no new props. No existing copy string changed; the only new string is the pill text. | |
| G1 | PASS | Every changed file is a ui-owned or qa-owned path from the spec's Owned paths table. | |
| G2 | PASS | No `'use client'` anywhere in the diff. | |
| G3 | PASS | No `instant = false` and no `loading.tsx`. The skeleton row is empty and aria-hidden, with no price or session data (skeletons.tsx:86). | |
| G4 | PASS | No `NEXT_PUBLIC_` or secret read in the diff. The e2e reads `SESSION_SECRET` from playwright.config.ts on the test side only (e2e/savings.spec.ts:39-45). | |
| G5 | PASS | Not applicable: no new file under `src/lib/**`. | |
| G6 | PASS | The pill is rendered in server components (price.tsx, badge.tsx). The island only receives server-rendered children (layout-toggle.tsx:51, unchanged), and nothing in the diff passes savings data to it. | |

Overall: PASS

Notes: The comment at e2e/savings.spec.ts:69 mentions "dispute, handoffs/phase-10/qa.md". I didn't open that file; the comment is harmless but points test code at a handoff file. The pill fitting the row relies on the label text inheriting a 1.5 line-height, because there is no `--text-label--line-height` in src/app/globals.css. The e2e fit check guards this.

Where the instructions got in the way: none

**Orchestrator decision:** close (qa PASS after 1 dispute decided by qa, all reviewer requirements PASS, 1 build round, builder not re-dispatched)
