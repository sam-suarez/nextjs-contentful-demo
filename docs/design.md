# UI and visual design

Source of truth for how the app looks. The user described the UI and provided example screens, references and design patterns to follow; this file is the written version of that brief. `docs/architecture.md` wins on anything about rendering, data or auth; this file wins on layout, copy and visual style. Agents treat it as read-only (D-028).

## Direction

A baby-toy shop that feels like a sticker book: **stable grid, wild decoration.** Content (product info, prices, forms) sits in clean, readable white cards on a strict grid. The space around it is playful: primitive shapes (circles, triangles, squiggles, pills), confetti colours, dot patterns and hard offset shadows that make elements look like cut-out paper.

Friendly, tactile, bright, bouncy. Never chaotic: decoration never overlaps text and never carries meaning on its own.

**Brand:** "Tiny Confetti". Tagline: "Bright, safe toys for little hands." The logo is three overlapping primitive shapes (violet circle, pink triangle, yellow square) with the wordmark in the heading font, as an inline SVG component.

## Design tokens

All tokens live in `src/app/globals.css` under Tailwind v4 `@theme` (CSS-first, no `tailwind.config.js`, D-005). Components use the token utilities (`bg-accent`, `shadow-pop`), never raw hex values. Light mode only; remove the scaffold's dark-mode block.

### Colours

| Token | Value | Use |
|---|---|---|
| `background` | `#FFFDF5` | Page (warm cream, paper feel) |
| `foreground` | `#1E293B` | Text, borders, hard shadows |
| `muted` | `#F1F5F9` | Quiet fills (placeholder, segmented control track) |
| `muted-foreground` | `#64748B` | Secondary text (4.7:1 on cream) |
| `accent` | `#8B5CF6` | Brand violet: focus ring, decoration, large text |
| `accent-strong` | `#7C3AED` | Filled buttons with white text and member-price text (5.7:1). White on `accent` is only 4.2:1, so `accent` never carries small white text |
| `secondary` | `#F472B6` | Pink pop: members-only badge, featured shadow |
| `tertiary` | `#FBBF24` | Yellow: secondary-button hover, big decorative circle |
| `quaternary` | `#34D399` | Mint: feature check circles |
| `sky` | `#38BDF8` | Extra confetti colour (category) |
| `tangerine` | `#FB923C` | Extra confetti colour (category) |
| `border` | `#E2E8F0` | Soft dividers, soft card shadow |
| `input-border` | `#CBD5E1` | Input borders at rest |
| `card` / `input` | `#FFFFFF` | Card and input fill |

Dark text (`foreground`) on any confetti colour passes AA (5.5:1 or better). Confetti colours are used rotationally for decoration, icons and emphasised words.

### Category colour and icon

Each category has one colour and one Lucide icon, used for its chip dot, the icon circle on cards and the card image backdrop.

| Category value | Label | Colour | Icon |
|---|---|---|---|
| `rattles-teethers` | Rattles & Teethers | `secondary` | `Baby` |
| `plush` | Plush | `accent` | `Rabbit` |
| `stacking-sorting` | Stacking & Sorting | `tertiary` | `Shapes` |
| `bath` | Bath | `sky` | `Bath` |
| `activity-sensory` | Activity & Sensory | `quaternary` | `Puzzle` |
| `musical` | Musical | `tangerine` | `Music` |

Labels and mapping live in one server module (`src/components/categories.ts`), keyed by `CATEGORIES` from `src/schemas/product.ts`.

### Typography

Loaded with `next/font/google` in the root layout (self-hosted at build, no runtime requests), replacing Geist.

- **Headings:** Outfit, 700 and 800. Prices also use Outfit 800 with `tabular-nums`.
- **Body:** Plus Jakarta Sans, 400 and 500 (700 for labels and buttons).
- **Scale (ratio 1.25):** 12.8 / 16 / 20 / 25 / 31.25 / 39 / 48.8 px. Page title 48.8 px on desktop, 31.25 px on mobile.
- **Labels:** 12.8 px, 700, uppercase, `tracking-wide`.

### Shape, border, shadow

- Radii: `sm` 8 px, `md` 16 px, `lg` 24 px, `full` pill. Cards `rounded-xl`; buttons, chips and badges pill.
- Borders: 2 px, `foreground` for interactive elements and cards; `border` for quiet dividers.
- **Pop shadow** (hard, no blur): `shadow-pop` = `4px 4px 0 0 foreground`; hover `6px 6px`; active `2px 2px`.
- **Sticker shadow** for cards: `8px 8px 0 0 border`; members-only cards use `8px 8px 0 0 secondary`.
- **Blob radius** for image frames in the specs layout and on the detail page: `rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none`.

### Texture

- **Dot grid** on the page background: a CSS `radial-gradient` pattern (1.5 px `border`-coloured dots every 24 px). No image file.
- **Squiggle:** an inline SVG wavy line under the page title, in `secondary`.
- **Confetti:** small SVG circles, triangles and squiggles, absolutely positioned behind the title area, in rotating confetti colours.
- All decoration is `aria-hidden="true"`, `pointer-events-none`, and hidden below `md`.

### Motion

- Easing token: `--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)`, 300 ms for hovers.
- **Pop-in:** cards enter with a CSS keyframe (scale 0.9 → 1, opacity 0 → 1, bounce easing, 400 ms), staggered with `animation-delay: calc(var(--i) * 40ms)` set from the server via an inline `style`. CSS only: it works without JavaScript and needs no client component.
- **Card hover:** `rotate(-1deg) scale(1.02)` plus a bigger shadow.
- **Icon wiggle:** keyframe rotate 0 → 3° → -3° → 0 on card hover.
- `prefers-reduced-motion: reduce` disables pop-in, wiggle, rotate and the button translate. Content must be fully visible with animations off (the keyframe uses `animation-fill-mode: both` only when motion is allowed).

### Icons

`lucide-react`, `strokeWidth={2.5}`, round caps and joins (library default), `aria-hidden="true"`. Icons always sit inside a shape (a coloured circle or pill), never alone. White icon on `accent-strong`, or `foreground` icon on a light confetti colour. Lucide icons are plain server-renderable components; they do not need `'use client'`.

## Components

Server components in `src/components/` unless marked as an island.

| Component | Spec |
|---|---|
| **Button, primary** ("candy") | `bg-accent-strong`, white 700 text, pill, 2 px `foreground` border, `shadow-pop`. Hover: translate (-2 px, -2 px) and 6 px shadow. Active: translate (2 px, 2 px) and 2 px shadow. Optional trailing `ArrowRight` in a small white circle. Min height 48 px |
| **Button, secondary** | Transparent, `foreground` text, 2 px `foreground` border, pill, no shadow. Hover: `bg-tertiary` |
| **Text link** | `accent-strong`, 700, underline with 2 px offset |
| **Category chip** | Pill, 2 px `foreground` border, white fill, small category-colour dot before the label. Active chip: `bg-foreground`, white text, `shadow-pop` in its category colour. A `<Link>` (see Filtering) |
| **Input** | White, 2 px `input-border`, `rounded-lg`, min height 48 px. Focus: border `accent`, `4px 4px 0 0 accent` shadow. A label always sits above it (uppercase label style) |
| **Badge** | Pill, 2 px `foreground` border, 12.8 px 700. "Members only": `bg-secondary`, `Sparkles` icon. "Member pricing": `bg-tertiary` |
| **Sticker card** | White, 2 px `foreground` border, `rounded-xl`, sticker shadow, pop-in, hover wiggle. The product name is a stretched link (`after:absolute after:inset-0`) so the whole card is clickable, with one link per card |
| **Icon circle** | 40 px circle in the category colour with a 2 px `foreground` border and the category icon; sits half over the top edge of the card body (`-mt-5`) |
| **Price** | Label (uppercase label style) above the amount (Outfit 800, `tabular-nums`). Logged out: label "Everyday price", amount in `foreground`. Logged in: label "Member price" in `accent-strong`, amount in `accent-strong`. Format: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`, always two decimals (`$11.20`, `$9.00`) |
| **Image frame** | Square, `object-contain`, on a dot-pattern backdrop tinted with the category colour at low opacity. `next/image` with `unoptimized` (architecture.md Error handling) and the product name as `alt` |
| **Image placeholder** | Same frame size, dashed 2 px `input-border`, `muted` fill, `ImageOff` icon in a white circle, text "Picture coming soon". Used when `image` is absent |
| **Banner** | Full-width strip under the header, white, bottom border. One sentence plus an optional text link (copy below). The text box keeps a minimum height so the logged-out and logged-in banners are the same height (three lines below about 360 px; accepted after P07, D-031) |
| **Segmented control** (layout) | Label "Layout"; pill track in `muted`, two options "Price first" / "Specs first"; the active one is white with a 2 px `foreground` border and `shadow-pop`. Exposes `aria-pressed` (island) or `aria-current` (links) |
| **Empty state** | Centred inside a sticker card: a cluster of three confetti shapes, heading "No toys match your search", body (copy below), secondary button "Clear filters" |
| **Alert** | 2 px `foreground` border, `bg-secondary/20`, `rounded-lg`, `role="alert"` |
| **Skeleton** | The `<Suspense>` fallback for content that reads request data (architecture.md Server/client boundary, D-031). Same outer size as the component it replaces at every breakpoint (same container, card frame, grid columns, row heights and min heights), so the swap causes no layout shift. Inside: `muted` blocks with `rounded-md` (pills where the real element is a pill) standing in for text, prices, images and buttons. A gentle pulse animation that is switched off under `prefers-reduced-motion: reduce`. The region carries `aria-busy="true"`; the blocks are `aria-hidden="true"` and contain no text, so no "Loading" copy appears. Server component, CSS only. Used for: the session part of the site header (Sign in button vs badge + name + Sign out), the catalog banner, the catalog filter card and grid (including the count; placeholder cards follow the grid's columns), the product detail body, and the login card (it reads `searchParams` and the session) |

## Page shell

- **Root layout** (`src/app/layout.tsx`): fonts, cream dot-grid background, `<main>`, and the static **footer**. The root layout never reads the session: a session read there would make every route block (D-020).
- **Site header** (a server component rendered by each page, not by the layout). Two variants:
  - `session` (used by `/` and `/products/[slug]`): logo on the left. Logged out: primary button "Sign in" linking to `/login`. Logged in: "Member pricing" badge, "Signed in as **<name>**", and secondary button "Sign out" (a plain `<form method="post" action="/logout">`, so it works without JS; D-034). The session controls always share one 48 px row with the logo, vertically centred and right-aligned. Below `md`, logged in, the badge and "Signed in as" name are visually hidden (kept for screen readers) and a 40 px `tertiary` circle with the name's initial stands in for them; from `md` they show in one row and long names are truncated with "…". Below `sm` header buttons use 16 px side padding; below 360 px the Sign in arrow and the initial circle are dropped so everything fits at 320 px (mobile header fix after deploy; replaces the P07 two-row header).
  - `minimal` (used by `/login` and `not-found.tsx`): logo on the left, text link "Back to catalog" on the right. It reads no session.
- **Container:** `max-w-6xl`, 16 px side padding on mobile, 24 px from `md`.
- **Footer:** white strip, top border. Left: "Tiny Confetti demo catalog". Right: "Prices in USD. Member prices need sign-in."

## Screens

Wireframes show structure only; style comes from the tokens and components above.

### Catalog `/` (P03; layout control upgraded in P05)

```
[logo] Tiny Confetti                                      ( Sign in -> )
----------------------------------------------------------------------
You're seeing everyday prices. Sign in to unlock member prices and members-only toys.
----------------------------------------------------------------------
   o  ^  ~       (confetti, big yellow circle behind the title, md+ only)
Toy catalog
~~~~~~~~~~~ (pink squiggle)
Bright, safe toys for little hands.

+-- filter card (white sticker card, no hover) -----------------------+
| SEARCH                                              LAYOUT          |
| [ Search toys by name or feature   ] ( Search )     [Price first|Specs first]
| (All) (o Rattles & Teethers) (o Plush) (o Stacking & Sorting)       |
| (o Bath) (o Activity & Sensory) (o Musical)     8 toys  ( Clear filters )
+---------------------------------------------------------------------+

Price first (default): 1 col, sm 2, lg 3, xl 4
+-----------------+  +-----------------+  +-----------------+
|  [image frame]  |  |  [placeholder]  |  |  [image frame]  |
|      (icon)     |  |      (icon)     |  |      (icon)     |
| EVERYDAY PRICE  |  | EVERYDAY PRICE  |  | EVERYDAY PRICE  |
| $28.00          |  | $14.00          |  | $24.00          |
| Cloud Bunny ... |  | Bubble Bath ... |  | Rainbow Ring... |
| Plush           |  | Bath            |  | Stacking & ...  |
| 0 months+ · Organic cotton, polyester fill                 |
+-----------------+  +-----------------+  +-----------------+

Specs first: 1 col, md 2. Card is horizontal from sm
+-----------------------------------------------------------+
| [blob image 128px] | Forest Friends Activity Cube [Members only]
|                    | (icon) Activity & Sensory             |
|                    | Age range ............. 12 months+    |
|                    | Material ... Birch plywood, non-toxic |
|                    | Highlight ......... Bead maze top     |
|                    | MEMBER PRICE ................ $71.20 |
+-----------------------------------------------------------+
```

- **Products:** one grid, sorted by name. With a session, members-only products are mixed into the same grid and carry the "Members only" badge plus the pink sticker shadow. The visibility rule is unchanged: without a session the page never receives them (D-014, D-017).
- **Card content:**
  - Price first: image, icon circle, price block, name, category label, then `ageRange · material` on one line.
  - Specs first: image left, then name with badge, category, rows "Age range", "Material" and "Highlight" (`features[0]`, row omitted when there are no features), and the price row last.
  - Both card variants are server-rendered in the same card. The grid wrapper's `data-layout` switches columns, card orientation and which spec block is visible with Tailwind `group-data-[layout=specs]:` utilities. The price is rendered **once** per card and moved with `order-*`, not duplicated.
- **Count:** "8 toys" ("1 toy" when singular), the number of products shown after filtering.
- **Banner (logged in):** "Member prices are on. You're also seeing 4 members-only toys." (the count of `authenticated` products the DAL returned, before filtering). The logged-out banner deliberately names no count: the logged-out page never receives Set B data, not even its size.
- **Empty state:** replaces the grid when filtering leaves nothing. Body: "Try a different word or category." when `q` is set, "No toys in this category yet." otherwise.

### Product detail `/products/[slug]` (P04)

```
[logo] Tiny Confetti                                      ( Sign in -> )
----------------------------------------------------------------------
Catalog / Plush / Cloud Bunny Plush            (breadcrumb, text links)

+---------------------------+   PLUSH (icon circle + label)
|                           |   Cloud Bunny Plush          (h1, Outfit 800)
|   [image frame, blob      |   A soft cloud-shaped bunny ... (description)
|    radius, dot backdrop]  |   +-- price card (sticker) -------------+
|                           |   | EVERYDAY PRICE                      |
|                           |   | $28.00                              |
+---------------------------+   | ----------------------------------  |
                                | Members get lower prices on every   |
                                | toy.        ( Sign in for member pricing )
                                +-------------------------------------+
                                Details
                                +-------------------------------------+
                                | Age range ............... 0 months+ |
                                | Material ... Organic cotton, poly.. |
                                +-------------------------------------+
                                What makes it special
                                (v) GOTS-certified organic cotton     (mint check circles)
                                (v) Embroidered eyes, no small parts
                                <- Back to catalog
```

- Two columns from `lg` (image 7 columns, info 5), stacked below.
- Breadcrumb category links to `/?category=<value>`.
- **Logged out:** price card as above. "Sign in for member pricing" is a secondary button linking to `/login?next=/products/<slug>`. The prompt text and the button are always stacked (text above the button), whatever the card width (accepted after P07, D-031).
- **Logged in:** label "Member price", amount in `accent-strong`, no sign-in row. In the same 80 px area (under the rule) members see a 40 px `quaternary` check circle with "Member price applied" (bold) and "You're signed in, so this price is yours." (`text-sm`, muted), vertically centred, so the card is the same size in both states (D-031; replaces the empty area accepted after P07). A members-only product shows the "Members only" badge next to the h1.
- The features list is omitted when `features` is absent.

### Login `/login` (P04)

```
[logo] Tiny Confetti                                   Back to catalog
----------------------------------------------------------------------
        +-- sticker card, max-w-md, pink sticker shadow --------+
        |  Sign in                                    (h1)      |
        |  Sign in to see member prices and members-only toys.  |
        |  This is a demo, so any username and password work.   |
        |  [alert, only with ?error=missing]                    |
        |  USERNAME                                             |
        |  [ demo                                    ]          |
        |  PASSWORD                                             |
        |  [ Any password                            ]          |
        |  (          Sign in  ->          )   full width       |
        +-------------------------------------------------------+
               Continue browsing without signing in   (text link to /)
```

- Fields `username` (placeholder "demo") and `password` (type `password`, placeholder "Any password"), both `required`. The form posts the login server action; a hidden `next` input carries the `next` search param through.
- Empty input after trimming: the action redirects to `/login?error=missing` (keeping `next`), and the page shows the alert "Enter a username and password to sign in." This works without JavaScript; no `useActionState` client component.
- The intro and demo note keep a fixed minimum height, so the login card matches its skeleton (accepted after P07, D-031).
- Decoration: two confetti shapes peeking out from behind the card corners (md+).

### Not found (P04)

```
[logo] Tiny Confetti                                   Back to catalog
----------------------------------------------------------------------
                       ( 404 )            (pill badge, bg-tertiary)
                 We can't find that toy                (h1)
     It may have been renamed or put back in the toy box.
                  ( Back to catalog -> )              (primary button)
            o   ^   ~   (confetti cluster, aria-hidden)
```

`not-found.tsx` receives no props in this Next version, so the copy does not echo the slug.

## Filtering and layout controls

Everything works with JavaScript disabled (D-019). Server-rendered links and GET forms carry all state in the URL.

- **Search:** `next/form` with `action="/"`, a `q` text input, a submit button "Search", and hidden inputs for the current `category` and `layout` so searching keeps them.
- **Category chips:** `<Link>`s to `/?category=<value>` that keep the current `q` and `layout`. "All" drops `category`. The active chip has `aria-current="true"`.
- **Clear filters:** secondary button, `<Link href="/">`.
- **Layout control:**
  - P03: two server `<Link>`s (`?layout=price` / `?layout=specs`, keeping `q` and `category`). Switching navigates, which is acceptable until P05.
  - P05: the client island in `src/components/client/` renders the same two links (so no-JS still works). With JS, it prevents navigation, flips `data-layout` on the grid wrapper, updates the URL with `history.replaceState`, and sets `aria-pressed`. It receives only the current layout and server-rendered `children` (D-019, D-022).

## Responsive

- Mobile first. Below `md`: stack everything, pop shadows shrink to 2 px, decoration hidden, filter card stacks (search, chips that wrap, then layout control and Clear filters).
- Tap targets at least 48 px tall (buttons, chips, inputs, segmented control options).
- No horizontal scrolling at 320 px.

## Accessibility

- Contrast: body text `foreground` on cream is 14:1; secondary text `muted-foreground` 4.7:1; white text only on `accent-strong` (5.7:1) or `foreground`.
- Colour never carries meaning alone: members-only cards have the badge text; the active chip has `aria-current` and the inverted fill; member prices have the "Member price" label.
- Focus: every interactive element shows a 2 px `accent` outline with offset plus the hard `accent` shadow (`:focus-visible`).
- Landmarks: `header`, `main`, `footer`; one `h1` per page; product cards are `article`s with the name as `h2` (catalog) and the stretched link.
- Respect `prefers-reduced-motion` (see Motion).

## Who builds what

| Phase | Screens and pieces |
|---|---|
| P03 | Tokens in `globals.css`, fonts, root layout + footer, both header variants (the `minimal` one is used later), banner, title area with decoration, filter card (search, chips, Clear filters, layout links), both card variants, price, image frame, placeholder, empty state, `lucide-react` dependency |
| P04 | Product detail, login (with error alert), not-found |
| P05 | Layout control island replacing the P03 links |
