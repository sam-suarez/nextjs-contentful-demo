# Next.js 16.4 notes for this repo

Read this instead of the bundled docs. Open a file under `node_modules/next/dist/docs/01-app/` only for an API that is not listed here, and grep it for the section you need rather than reading it whole. The orchestrator appends a line here whenever a phase hits a new framework surprise (`agents/orchestrator.md` step 10).

Versions: next 16.4.2, react 19.3, `cacheComponents: true`, `partialPrefetching: true`, Turbopack, Tailwind v4, Vitest 5, Playwright.

## APIs this app uses

| API | Import | Rule |
|---|---|---|
| `cookies()` | `next/headers` | async. Read in server components; `.set` / `.delete` only in a server function or route handler, never during render |
| `redirect()`, `notFound()` | `next/navigation` | Before streaming starts: real 307 / 404. Inside a `<Suspense>` boundary that already streamed: the response stays 200 (meta-tag redirect, `noindex` not-found). Server-action `redirect` is a client navigation (303 without JS) |
| `<Suspense>` | `react` | Required around anything that reads `cookies()`, `searchParams` or `params` under Cache Components; a read outside a boundary is a build error. Everything outside prerenders into the static shell |
| `"use cache"` + `cacheLife(p)` + `cacheTag(t)` | `next/cache` | Function-level directive. Never call `cookies()` / `headers()` inside; read outside, pass plain values in. Profiles: `seconds`, `minutes`, `hours` (repo uses this), `days`, `weeks`, `max`, `default` |
| `cache()` | `react` | Per-request memoisation (used for `verifySession`) |
| `"use server"` | directive | Function-level in `src/lib/auth/actions.ts`, because `import "server-only";` must be the file's first line |
| `proxy(request)` + `config.matcher` | `src/proxy.ts`, `next/server` | Middleware renamed to Proxy in 16. Node runtime by default; `runtime` config throws. Matcher values must be literal constants. Read cookies with `request.cookies`, not `cookies()`. Don't rely on module globals being shared with render code |
| `<Form action="/">` | `next/form` | String action = GET form, values become search params, client navigation, works without JS |
| `<Link>` | `next/link` | Plain hrefs; Clear filters is `<Link href="/">` |
| `<Image unoptimized>` | `next/image` | SVG art needs `unoptimized`; remote host in `images.remotePatterns` |
| `useSearchParams()` | `next/navigation` | Client only. On a prerendered route it client-renders up to the nearest `<Suspense>` |
| `params`, `searchParams` | page props | Both are Promises; `await` them inside the Suspense boundary, not in the page body |

## Surprises already paid for

- `export const instant = false` only switches off dev-time instant-navigation validation. It does not make a route block or render fully on the server (D-031). Don't use it.
- `/products/[slug]` (dynamic segment, no `generateStaticParams`) builds `◐` Partial Prerender. `await connection()` does not change that. Server status codes for that route come from `src/proxy.ts` (D-032).
- With `cacheComponents`, the previous route stays mounted in a hidden `<Activity>`. Whole-DOM counts in e2e see the old page; count visible elements, or `page.reload()` first. A `RedirectBoundary` inside a hidden entry can replay its redirect when the URL is visited again (OI-1).
- `next build` type-checks every `*.test.ts` (tsconfig includes `**/*.ts`). A pre-build test importing a module that does not exist yet breaks the build, so pre-build `verify-ssr.sh` stops at the build step.
- React escapes `'` as `&#x27;` and `&` as `&amp;`, and inserts `<!-- -->` between adjacent text nodes. A grepped string must be one text node. The flight payload repeats content and escapes `$` as `$$`, so never assert an exact count on a bare price string.
- Vitest 5 defaults to `clearMocks: true`: call history recorded at import time is gone inside an `it`.
- `next/experimental/testing/server` exports `unstable_doesMiddlewareMatch`, not the `unstable_doesProxyMatch` the proxy doc names.
- `group-data-*` matches descendants only; the element carrying `data-layout` can't style itself with it.
- A held animation `transform` (`animation-fill-mode: both`) overrides a hover `transform`; use the separate `rotate` / `scale` properties.
- Turbopack can serve stale CSS after another agent's build. If styles look wrong, `rm -rf .next` and rebuild.
- Never `pkill -f next-server`: it also kills the human's `next dev`. Stop only the PID your script started.
- With `instant = false` gone and request reads inside `<Suspense>`, `/`, `/login` and `/products/[slug]` all build `◐` (Partial Prerender). That is the expected D-031 state, not a regression.
- `notFound()` called inside a `<Suspense>` boundary can't change the already-sent status: an unknown slug answers 200 with `noindex` and renders `not-found.tsx` from the stream. Only `src/proxy.ts` can give a real status code.
- A client island calling `useSearchParams()` must sit inside a `<Suspense>` once the route is no longer fully dynamic, or the build fails.
- In a Route Handler under `next start`, `request.url` is built from the server's listen config (`http://localhost:<port>`), not the `Host` header (`router-utils/resolve-routes.js`). For an Origin/CSRF check, compare the `Origin` host with `x-forwarded-host` ?? `host`, as Server Actions do.
