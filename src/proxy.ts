import { type NextRequest, NextResponse } from "next/server";

import { isMembersOnlySlug } from "@/lib/products/members-only";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PRODUCT_PATH_PREFIX = "/products/";

/**
 * Optimistic redirects only (D-017, D-032). This is never the authorization check; the DAL is.
 * - /login with a valid session cookie: 307 to /.
 * - /products/<slug> without a valid session, for a Set B slug: 307 to /login?next=/products/<slug>.
 * Everything else passes through. A failed Set B lookup also passes through (fail open).
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(PRODUCT_PATH_PREFIX)) {
    if (session) return NextResponse.next();
    const slug = pathname.slice(PRODUCT_PATH_PREFIX.length);
    let membersOnly = false;
    try {
      membersOnly = await isMembersOnlySlug(slug);
    } catch {
      // Fail open: the page's DAL check still protects the data.
      console.warn("[proxy] members-only lookup failed; passing the request through");
    }
    if (!membersOnly) return NextResponse.next();
    const url = new URL("/login", request.url);
    url.searchParams.set("next", PRODUCT_PATH_PREFIX + slug);
    return NextResponse.redirect(url, 307);
  }

  if (session) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/login", "/products/:slug"] };
