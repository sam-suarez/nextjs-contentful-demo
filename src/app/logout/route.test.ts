// Phase 04-fix2 (D-034): POST /logout route handler. Contract: handoffs/phase-04-fix2/spec.md.
// `deleteSession` is mocked; no Next request context is needed (spec, Contract).
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteSession: vi.fn(async (): Promise<void> => {}),
  // Only src/lib/** may read cookies (architecture.md Data access), and the handler does no
  // session read (R4). Any cookies()/headers() call from the handler is recorded and throws,
  // as it would outside a Next request context.
  cookies: vi.fn(async () => {
    throw new Error("next/headers cookies() called from the /logout handler");
  }),
  headers: vi.fn(async () => {
    throw new Error("next/headers headers() called from the /logout handler");
  }),
}));

vi.mock("@/lib/session", () => ({ deleteSession: mocks.deleteSession }));
vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
  headers: mocks.headers,
}));

import * as routeModule from "./route";
import { POST } from "./route";

const URL_ = "http://localhost:3000/logout";
const APP_ORIGIN = "http://localhost:3000";
const SESSION_COOKIE_HEADER =
  "session=eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiYWRhIn0.c2lnbmF0dXJl";

// Amended contract (spec, Amendments): appHost = first value of x-forwarded-host (trimmed)
// ?? host ?? new URL(request.url).host; Origin is compared by host. Under `next start`,
// request.url is always http://localhost:<port>, so R2/R3 set Host (and once
// X-Forwarded-Host) explicitly, with a host that differs from request.url's where it matters.
const APP_HOST = "localhost:3000";
const R2_CASES: [string, Record<string, string>][] = [
  ["no Origin header (Host localhost:3000)", { Host: APP_HOST }],
  [
    "Host 127.0.0.1:3220 and Origin http://127.0.0.1:3220 (request.url host differs)",
    { Host: "127.0.0.1:3220", Origin: "http://127.0.0.1:3220" },
  ],
  [
    "X-Forwarded-Host 'shop.example.com, proxy.internal', Host localhost:3000, Origin https://shop.example.com",
    {
      Host: APP_HOST,
      "X-Forwarded-Host": "shop.example.com, proxy.internal",
      Origin: "https://shop.example.com",
    },
  ],
];
const R3_CASES: [string, Record<string, string>][] = [
  ...[
    "https://evil.example",
    "null",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://localhost:3000.evil.example",
  ].map((origin): [string, Record<string, string>] => [
    `Host localhost:3000 and foreign Origin ${origin}`,
    { Host: APP_HOST, Origin: origin },
  ]),
  [
    "Host shop.example.com and Origin http://localhost:3000 (equal to request.url's origin only)",
    { Host: "shop.example.com", Origin: APP_ORIGIN },
  ],
];

function post(headers: Record<string, string> = {}): Promise<Response> {
  return POST(new Request(URL_, { method: "POST", headers }));
}

describe("POST /logout", () => {
  beforeEach(() => {
    mocks.deleteSession.mockClear();
    mocks.cookies.mockClear();
    mocks.headers.mockClear();
  });

  it("R1: route.ts exports exactly one binding, POST", () => {
    expect(Object.keys(routeModule).sort()).toEqual(["POST"]);
  });

  it("R1: POST is a function", () => {
    expect(typeof routeModule.POST).toBe("function");
  });

  it.each<[string, Record<string, string>]>(R2_CASES)(
    "R2: with %s, calls deleteSession() exactly once",
    async (_label, headers) => {
      await post(headers);
      expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
    },
  );

  it.each<[string, Record<string, string>]>(R2_CASES)(
    "R2: with %s, answers 303 with Location exactly /",
    async (_label, headers) => {
      const response = await post(headers);
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/");
    },
  );

  it("R2: the 303 is returned only after deleteSession() has settled", async () => {
    let settle: () => void = () => {};
    mocks.deleteSession.mockImplementationOnce(
      () => new Promise<void>((resolve) => (settle = resolve)),
    );
    let answered = false;
    const pending = post().then((response) => {
      answered = true;
      return response;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(answered).toBe(false);
    settle();
    expect((await pending).status).toBe(303);
  });

  it.each<[string, Record<string, string>]>(R3_CASES)(
    "R3: with %s, answers 403 with no Location header",
    async (_label, headers) => {
      const response = await post(headers);
      expect(response.status).toBe(403);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it.each<[string, Record<string, string>]>(R3_CASES)(
    "R3: with %s, does not call deleteSession()",
    async (_label, headers) => {
      await post(headers);
      expect(mocks.deleteSession).not.toHaveBeenCalled();
    },
  );

  it("R4: with a session cookie and no Origin, answers 303 to / and calls deleteSession() once", async () => {
    const response = await post({ Cookie: SESSION_COOKIE_HEADER });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
    expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
  });

  it("R4: with a session cookie and a same Origin, answers 303 to / and calls deleteSession() once", async () => {
    const response = await post({
      Cookie: SESSION_COOKIE_HEADER,
      Origin: APP_ORIGIN,
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
    expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
  });

  it("R4: with a session cookie and a foreign Origin, answers 403 and does not call deleteSession()", async () => {
    const response = await post({
      Cookie: SESSION_COOKIE_HEADER,
      Origin: "https://evil.example",
    });
    expect(response.status).toBe(403);
    expect(mocks.deleteSession).not.toHaveBeenCalled();
  });

  it("R4: without a session cookie, resolves (never throws)", async () => {
    await expect(post()).resolves.toBeInstanceOf(Response);
  });

  it("R4: does no session read (never calls cookies() or headers() from next/headers)", async () => {
    await post({ Cookie: SESSION_COOKIE_HEADER });
    await post();
    await post({ Origin: "https://evil.example" });
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.headers).not.toHaveBeenCalled();
  });
});
