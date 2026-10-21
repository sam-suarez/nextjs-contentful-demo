# Manual QA checklist

What a person checks in the browser before a release or a demo. Everything here is also covered by automated checks (`npm test`, `scripts/verify-ssr.sh`, `npm run test:e2e`); this list is about seeing the features work.

Start the app (see README, "Run locally"), open http://localhost:3000 and tick each box. About 10 minutes. With mock data the catalog has 12 toys: 8 public and 4 members-only.

## Catalog, logged out

- [ ] The header shows **Sign in**. The banner says "You're seeing everyday prices. Sign in to unlock member prices and members-only toys."
- [ ] The count says **8 toys**. Every card shows an **Everyday price**, and no card has a "Members only" badge.
- [ ] **Bubble Bath Whale** has no product image and shows the placeholder art instead of a broken image.
- [ ] View page source: "Everyday price" is in the HTML and "Member price" is not. Prices are rendered on the server.

## Sign in

- [ ] Click **Sign in**, then enter any username and password. You land on the catalog.
- [ ] The header shows **Signed in as** your name, with **Sign out**. The banner says "Member prices are on. You're also seeing 4 members-only toys."
- [ ] The count says **12 toys**. Four cards carry a **Members only** badge (Forest Friends Activity Cube, Heirloom Wooden Xylophone, Moonbeam Musical Mobile, Sensory Crinkle Book Set).
- [ ] Every card shows a **Member price** (for example, Cloud Bunny Plush is $22.40 instead of $28.00).
- [ ] View page source: "Member price" and the members-only product names are in the HTML.

## Layouts

- [ ] Click **Specs first**: the cards switch to the specs layout, with the price last, and the URL gets `?layout=specs`. The page does not reload: in DevTools → Network, no new document request appears.
- [ ] Click **Price first**: back to the default layout and URL.
- [ ] Open `/?layout=specs` directly: the page loads already in the specs layout.

## Filters

- [ ] Click the **Bath** category chip: only bath toys show (2 toys) and the URL has `?category=bath`.
- [ ] Search **washable**: the results match, and the category stays applied if one was selected.
- [ ] Search for a word nothing matches (for example `zzz`): "No toys match your search" with a **Clear filters** button.
- [ ] Click **Clear filters**: back to the full catalog at `/`.

## Product detail

- [ ] Click a card: the detail page shows a breadcrumb, the name, the image, the features and the price for your session.
- [ ] Logged out, open `/products/cloud-bunny-plush`: **Everyday price** $28.00 and a **Sign in for member pricing** button.

## Members-only pages

- [ ] Logged out, open `/products/forest-friends-activity-cube`: you are sent to the sign-in page.
- [ ] Sign in there: you land **on that product**, with the **Member price** $71.20 and the **Members only** badge.

## Errors

- [ ] Open `/products/no-such-toy`: a friendly **404** page with **Back to catalog**.

## Sign out

- [ ] While viewing a members-only product, click **Sign out**: you land on the catalog showing **Sign in** and 8 toys.
- [ ] In DevTools → Elements, search for "Forest Friends" without reloading: **no results**. Nothing members-only is left in the page.

## Loading states

- [ ] In DevTools → Network, set throttling to **Slow 4G**, then reload `/`: grey placeholder blocks show in the header, banner and catalog, then the real content appears in the same place without anything jumping.
- [ ] Repeat at a phone width (375 px, DevTools device toolbar).
