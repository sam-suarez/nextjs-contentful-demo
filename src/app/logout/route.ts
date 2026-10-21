import { deleteSession } from "@/lib/session";

/**
 * The host the browser addressed: the first `x-forwarded-host` value, else `host`, else the
 * request URL's host. Under `next start`, `request.url` is built from the listen config, so it is
 * only the last fallback (same rule as Next's Server Actions CSRF check).
 */
function appHost(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded !== null) return forwarded.split(",")[0].trim();
  return request.headers.get("host") ?? new URL(request.url).host;
}

/** A present `Origin` is foreign unless it parses and its host equals the app host (`null` never parses). */
function isForeignOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  try {
    return new URL(origin).host !== appHost(request);
  } catch {
    return true;
  }
}

/**
 * Sign out (D-034): a plain form POST, so the 303 makes the browser do a full page load and no
 * hidden copy of the members-only page stays in the tab. No session read; works without one.
 * Only POST is exported, so Next answers 405 to every other method.
 */
export async function POST(request: Request): Promise<Response> {
  if (isForeignOrigin(request)) {
    return new Response(null, { status: 403 });
  }
  await deleteSession();
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
