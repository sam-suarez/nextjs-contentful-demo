import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The proxy must read the cookie from request.cookies only; next/headers is a trap here.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => {
    throw new Error("proxy must not call cookies() from next/headers");
  }),
}));

import { signSession } from "@/lib/session";
import { config, proxy } from "@/proxy";

const SECRET = "proxy-test-secret-0123456789-abcdefgh"; // > 32 chars
const nowSeconds = () => Math.floor(Date.now() / 1000);

function loginRequest(cookie?: string, origin = "http://localhost:3000"): NextRequest {
  const headers = new Headers();
  if (cookie !== undefined) headers.set("cookie", cookie);
  return new NextRequest(`${origin}/login`, { headers });
}

function expectPassThrough(response: Response) {
  expect(response.headers.get("location")).toBeNull();
  expect(response.status).toBe(200);
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

describe("proxy", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("R14: /login with a valid session cookie redirects 307 to / on the request origin", async () => {
    const token = await signSession("ada");
    const response = await proxy(loginRequest(`session=${token}`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("R14: the redirect keeps a non-default request origin", async () => {
    const token = await signSession("ada");
    const response = await proxy(loginRequest(`session=${token}`, "https://shop.example.test:8443"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://shop.example.test:8443/");
  });

  it("R14: the redirect goes to / and ignores ?next", async () => {
    const token = await signSession("ada");
    const request = new NextRequest("http://localhost:3000/login?next=%2Fproducts%2Fx", {
      headers: { cookie: `session=${token}` },
    });
    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("R14: a valid session cookie is found among other cookies", async () => {
    const token = await signSession("ada");
    const response = await proxy(loginRequest(`theme=dark; session=${token}; other=1`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("R15: /login with no cookie passes through", async () => {
    expectPassThrough(await proxy(loginRequest()));
  });

  it("R15: /login with a valid token under a different cookie name passes through", async () => {
    const token = await signSession("ada");
    expectPassThrough(await proxy(loginRequest(`not-session=${token}`)));
  });

  it("R15: /login with a garbage session cookie passes through", async () => {
    expectPassThrough(await proxy(loginRequest("session=not-a-jwt")));
  });

  it("R15: /login with an empty session cookie passes through", async () => {
    expectPassThrough(await proxy(loginRequest("session=")));
  });

  it("R15: /login with a tampered session cookie passes through", async () => {
    const token = await signSession("ada");
    const [header, payload, signature] = token.split(".");
    const flipped = (signature[5] === "A" ? "B" : "A") as string;
    const tampered = [header, payload, signature.slice(0, 5) + flipped + signature.slice(6)].join(".");
    expectPassThrough(await proxy(loginRequest(`session=${tampered}`)));
  });

  it("R15: /login with an expired session cookie passes through", async () => {
    const expired = await new SignJWT({ name: "ada" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(nowSeconds() - 60)
      .sign(new TextEncoder().encode(SECRET));
    expectPassThrough(await proxy(loginRequest(`session=${expired}`)));
  });

  it("R15: /login with a session cookie signed by another secret passes through", async () => {
    const forged = await new SignJWT({ name: "ada" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(nowSeconds() + 3600)
      .sign(new TextEncoder().encode("some-other-secret-0123456789-abcdefgh"));
    expectPassThrough(await proxy(loginRequest(`session=${forged}`)));
  });

  it("R16: config is exactly { matcher: ['/login'] } with no runtime option", () => {
    expect(config).toEqual({ matcher: ["/login"] });
    expect(config).not.toHaveProperty("runtime");
  });
});
