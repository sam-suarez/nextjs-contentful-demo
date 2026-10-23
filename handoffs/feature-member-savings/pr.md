## Member savings line

Signed-in members now see a mint **You save 20%** pill directly under every member price: on both catalog card layouts (right-aligned in Specs first) and on the product detail price card. The percent is computed on the server by the DAL. Signed-out pages never contain it and hold nothing derived from member prices.

### Decisions (D-036)

The human's answers from the interview, recorded in `handoffs/feature-member-savings/intake.md` and written into the docs in the `docs(arch)` commit (df43efc).

- I1: shown on every member price: both catalog card variants and the detail price card.
- I2: the DAL resolves `savingsPercent: number | null` on `CatalogProduct`. Pages only render it and never receive the everyday price for a member-tier product.
- I3: `Math.round((1 - member / everyday) * 100)`. It is `null` for the everyday tier, when the rounded value is 0 or less, or when the everyday price is 0.
- I4: copy `You save <n>%`, rendered as one text node.
- I5: the pill gets its own line under the amount. The human chose this over the recommended "same row as the amount".
- I6: a Badge-style pill with a `quaternary` (mint) fill and `foreground` text.
- I7: every price block reserves the row at one fixed height: signed out, no saving, and the skeletons. That's the shared `PRICE_SAVINGS_ROW` constant, so CLS stays below 0.01.
- I8: in Specs first the pill sits under the amount, right-aligned.
- I9: no savings teaser for signed-out visitors.

### Phases

| Phase | Builder | Commit | qa post-build | Human check |
|-------|---------|--------|---------------|-------------|
| 09 savings percent | data-auth | `bb81078` | PASS (unit 454, verify-ssr 495; 1 pre-build spec amendment) | passed |
| 10 savings line | ui | `457e87f` | PASS (unit 458, verify-ssr 514, e2e 43; 1 disputed e2e test fixed by qa: wait for the pop-in animation) | passed |

### Already live

None. There are no Contentful, schema or mock data changes; the percent comes from the existing `priceLoggedOut` and `priceAuthenticated` fields.

### How to verify

Each phase's 10-minute check is in its own file: `handoffs/phase-09/human-check.md` and `handoffs/phase-10/human-check.md`. After merging, the next `/ship` records the merge in `handoffs/STATE.md`.

### Notes

- **Decision ID clash:** this feature uses **D-036**. During the build, another session briefly edited `agents/` in the same working tree and added a `/ship-minor` lane that also cited D-036. Those edits were reverted on disk and are not in this branch. That lane should take D-037 or later.
- **Proposed `/ship` change:** put the human-check steps inside the question's preview, because the dialog hides the message above it. This is logged in `docs/intervention-log.md` and needs a human-authorized edit to `agents/orchestrator.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
