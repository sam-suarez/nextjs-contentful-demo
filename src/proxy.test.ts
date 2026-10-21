import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The proxy must read the cookie from request.cookies only; next/headers is a trap here (R9).
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => {
    throw new Error("proxy must not call cookies() from next/headers");
  }),
}));

// Phase 04-fix1: the proxy asks src/lib/products/members-only.ts (contract: isMembersOnlySlug)
// whether a slug is Set B. Mocked so each test controls the answer and can see every call.
const membersOnly = vi.hoisted(() => ({
  isMembersOnlySlug: vi.fn<(slug: string) => Promise<boolean>>(),
  MEMBERS_ONLY_SLUGS_TTL_MS: 5 * 60 * 1000,
}));
vi.mock("@/lib/products/members-only", () => membersOnly);

import mockData from "@/data/products.mock.json";
import { signSession } from "@/lib/session";
import { config, proxy } from "@/proxy";

const SECRET = "proxy-test-secret-0123456789-abcdefgh"; // > 32 chars
const OTHER_SECRET = "some-other-secret-0123456789-abcdefgh";
const ORIGIN = "http://localhost:3000";
const nowSeconds = () => Math.floor(Date.now() / 1000);

// Expected values from src/data/products.mock.json.
const AUTH_SLUGS = mockData.items
  .filter((e) => e.fields.visibility === "authenticated")
  .map((e) => e.fields.slug);
const SET_B = "forest-friends-activity-cube";
const PUBLIC = "cloud-bunny-plush";
const UNKNOWN = "no-such-toy";
const PATTERN_FAILING = "Not-Valid-Slug";

function request(path: string, cookie?: string, origin = ORIGIN): NextRequest {
  const headers = new Headers();
  if (cookie !== undefined) headers.set("cookie", cookie);
  return new NextRequest(`${origin}${path}`, { headers });
}
const loginRequest = (cookie?: string, origin = ORIGIN) => request("/login", cookie, origin);
const productRequest = (slug: string, cookie?: string, origin = ORIGIN) =>
  request(`/products/${slug}`, cookie, origin);

function expectPassThrough(response: Response) {
  expect(response.headers.get("location")).toBeNull();
  expect(response.status).toBe(200);
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

/** R4 rule: 307, Location on the request origin, pathname /login, exactly one param next=/products/<slug>. */
function expectLoginRedirect(response: Response, requestUrl: string, slug: string) {
  expect(response.status).toBe(307);
  const location = response.headers.get("location");
  expect(location).not.toBeNull();
  const target = new URL(location as string, requestUrl);
  expect(target.origin).toBe(new URL(requestUrl).origin);
  expect(target.pathname).toBe("/login");
  expect([...target.searchParams.keys()]).toStrictEqual(["next"]);
  expect(target.searchParams.get("next")).toBe(`/products/${slug}`);
}

async function expiredToken() {
  return new SignJWT({ name: "ada" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(nowSeconds() - 60)
    .sign(new TextEncoder().encode(SECRET));
}

async function forgedToken() {
  return new SignJWT({ name: "ada" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(nowSeconds() + 3600)
    .sign(new TextEncoder().encode(OTHER_SECRET));
}

async function tamperedToken() {
  const token = await signSession("ada");
  const [header, payload, signature] = token.split(".");
  const flipped = (signature[5] === "A" ? "B" : "A") as string;
  return [header, payload, signature.slice(0, 5) + flipped + signature.slice(6)].join(".");
}

/** Cookie headers that carry no valid session (R4: missing, garbage, expired, wrong secret, other name). */
const NO_SESSION_CASES: { label: string; cookie: () => Promise<string | undefined> }[] = [
  { label: "no cookie", cookie: async () => undefined },
  { label: "a garbage session cookie", cookie: async () => "session=not-a-jwt" },
  { label: "an empty session cookie", cookie: async () => "session=" },
  { label: "an expired session cookie", cookie: async () => `session=${await expiredToken()}` },
  { label: "a session cookie signed by another secret", cookie: async () => `session=${await forgedToken()}` },
  { label: "a tampered session cookie", cookie: async () => `session=${await tamperedToken()}` },
  { label: "a valid token under another cookie name", cookie: async () => `not-session=${await signSession("ada")}` },
];

describe("proxy", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.mocked(cookies).mockClear();
    membersOnly.isMembersOnlySlug.mockReset().mockImplementation(async (slug) => AUTH_SLUGS.includes(slug));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // --- R4: Set B slug without a valid session -> 307 to /login?next=... ----------

  it.each(NO_SESSION_CASES)("R4: /products/<Set B slug> with $label redirects 307 to /login?next=/products/<slug>", async ({ cookie }) => {
    const req = productRequest(SET_B, await cookie());
    expectLoginRedirect(await proxy(req), req.url, SET_B);
  });

  it.each(AUTH_SLUGS)("R4: every Set B slug redirects without a session (%s)", async (slug) => {
    const req = productRequest(slug);
    expectLoginRedirect(await proxy(req), req.url, slug);
  });

  it("R4: the redirect keeps a non-default request origin", async () => {
    const req = productRequest(SET_B, undefined, "https://shop.example.test:8443");
    expectLoginRedirect(await proxy(req), req.url, SET_B);
  });

  it("R4: a query string on the product URL is not carried into the redirect", async () => {
    const req = request(`/products/${SET_B}?layout=specs&next=%2F%2Fevil.com`);
    expectLoginRedirect(await proxy(req), req.url, SET_B);
  });

  it("R4: the redirect works when the session cookie sits among other cookies but is invalid", async () => {
    const req = productRequest(SET_B, "theme=dark; session=not-a-jwt; other=1");
    expectLoginRedirect(await proxy(req), req.url, SET_B);
  });

  // --- R5: pass-through cases on /products/<slug> -------------------------------

  it("R5: /products/<Set B slug> with a valid session passes through", async () => {
    expectPassThrough(await proxy(productRequest(SET_B, `session=${await signSession("ada")}`)));
  });

  it("R5: with a valid session isMembersOnlySlug is not called at all (Set B slug)", async () => {
    await proxy(productRequest(SET_B, `session=${await signSession("ada")}`));
    expect(membersOnly.isMembersOnlySlug).not.toHaveBeenCalled();
  });

  it("R5: with a valid session among other cookies isMembersOnlySlug is not called (public slug)", async () => {
    const response = await proxy(productRequest(PUBLIC, `theme=dark; session=${await signSession("ada")}; x=1`));
    expectPassThrough(response);
    expect(membersOnly.isMembersOnlySlug).not.toHaveBeenCalled();
  });

  it("R5: no session + public slug passes through", async () => {
    expectPassThrough(await proxy(productRequest(PUBLIC)));
  });

  it("R5: no session + unknown slug passes through", async () => {
    expectPassThrough(await proxy(productRequest(UNKNOWN)));
  });

  it("R5: no session + pattern-failing slug passes through", async () => {
    expectPassThrough(await proxy(productRequest(PATTERN_FAILING)));
  });

  it("R5: a garbage session cookie + public slug passes through", async () => {
    expectPassThrough(await proxy(productRequest(PUBLIC, "session=not-a-jwt")));
  });

  it("R5: no session + a slug the helper reports false passes through even if it looks Set B-like", async () => {
    membersOnly.isMembersOnlySlug.mockReset().mockResolvedValue(false);
    expectPassThrough(await proxy(productRequest(SET_B)));
  });

  // --- R6: /login unchanged -----------------------------------------------------

  it("R6: /login with a valid session cookie redirects 307 to / on the request origin", async () => {
    const response = await proxy(loginRequest(`session=${await signSession("ada")}`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("R6: the /login redirect keeps a non-default request origin", async () => {
    const response = await proxy(loginRequest(`session=${await signSession("ada")}`, "https://shop.example.test:8443"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://shop.example.test:8443/");
  });

  it("R6: the /login redirect goes to / and ignores ?next", async () => {
    const req = request(`/login?next=%2Fproducts%2F${SET_B}`, `session=${await signSession("ada")}`);
    const response = await proxy(req);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("R6: a valid session cookie is found among other cookies on /login", async () => {
    const response = await proxy(loginRequest(`theme=dark; session=${await signSession("ada")}; other=1`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it.each(NO_SESSION_CASES)("R6: /login with $label passes through", async ({ cookie }) => {
    expectPassThrough(await proxy(loginRequest(await cookie())));
  });

  it("R6: /login?next=/products/<Set B slug> without a session passes through", async () => {
    expectPassThrough(await proxy(request(`/login?next=%2Fproducts%2F${SET_B}`)));
  });

  it("R6: /login without a session never calls isMembersOnlySlug", async () => {
    await proxy(request(`/login?next=%2Fproducts%2F${SET_B}`));
    expect(membersOnly.isMembersOnlySlug).not.toHaveBeenCalled();
  });

  it("R6: /login with a valid session never calls isMembersOnlySlug", async () => {
    await proxy(loginRequest(`session=${await signSession("ada")}`));
    expect(membersOnly.isMembersOnlySlug).not.toHaveBeenCalled();
  });

  it("R6: /login with a garbage session cookie never calls isMembersOnlySlug", async () => {
    await proxy(loginRequest("session=not-a-jwt"));
    expect(membersOnly.isMembersOnlySlug).not.toHaveBeenCalled();
  });

  // --- R7: helper failure -> fail open --------------------------------------------

  it("R7: if isMembersOnlySlug rejects, the proxy resolves (does not throw)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    membersOnly.isMembersOnlySlug.mockReset().mockRejectedValue(new Error("contentful down"));
    await expect(proxy(productRequest(SET_B))).resolves.toBeDefined();
  });

  it("R7: if isMembersOnlySlug rejects, the request passes through (no redirect, no 500)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    membersOnly.isMembersOnlySlug.mockReset().mockRejectedValue(new Error("contentful down"));
    expectPassThrough(await proxy(productRequest(SET_B)));
  });

  it("R7: a rejection for one request does not stop the next request from redirecting", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    membersOnly.isMembersOnlySlug
      .mockReset()
      .mockRejectedValueOnce(new Error("contentful down"))
      .mockImplementation(async (slug) => AUTH_SLUGS.includes(slug));
    expectPassThrough(await proxy(productRequest(SET_B)));
    const req = productRequest(SET_B);
    expectLoginRedirect(await proxy(req), req.url, SET_B);
  });

  // --- R8: matcher --------------------------------------------------------------

  it("R8: config is exactly { matcher: ['/login', '/products/:slug'] }", () => {
    expect(config).toStrictEqual({ matcher: ["/login", "/products/:slug"] });
  });

  // --- R9: inputs come from request.cookies and request.nextUrl.pathname only ----

  it("R9: the proxy never calls cookies() from next/headers on /products/<slug>", async () => {
    await proxy(productRequest(SET_B));
    await proxy(productRequest(PUBLIC, `session=${await signSession("ada")}`));
    expect(cookies).not.toHaveBeenCalled();
  });

  it("R9: the proxy never calls cookies() from next/headers on /login", async () => {
    await proxy(loginRequest());
    await proxy(loginRequest(`session=${await signSession("ada")}`));
    expect(cookies).not.toHaveBeenCalled();
  });

  it("R9: isMembersOnlySlug is called exactly once, with the slug from the pathname", async () => {
    await proxy(productRequest(SET_B));
    expect(membersOnly.isMembersOnlySlug.mock.calls).toStrictEqual([[SET_B]]);
  });

  it("R9: the slug comes from the pathname, not from the query string", async () => {
    const req = request(`/products/${PUBLIC}?slug=${SET_B}`);
    expectPassThrough(await proxy(req));
    expect(membersOnly.isMembersOnlySlug.mock.calls).toStrictEqual([[PUBLIC]]);
  });

  it("R9: a session passed in a header other than Cookie is ignored", async () => {
    const token = await signSession("ada");
    const req = new NextRequest(`${ORIGIN}/products/${SET_B}`, {
      headers: { authorization: `Bearer ${token}`, "x-session": token },
    });
    expectLoginRedirect(await proxy(req), req.url, SET_B);
  });
});
