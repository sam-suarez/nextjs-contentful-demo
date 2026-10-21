import "server-only";
import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class RedirectSignal extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT ${url}`);
    }
  }
  return {
    RedirectSignal,
    cookieStore: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
    // Like Next's redirect(), the mock throws so nothing after it runs.
    redirect: vi.fn((url: string): never => {
      throw new RedirectSignal(url);
    }),
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

// Wrap the real session functions in spies so calls are observable and cookies are still set.
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    createSession: vi.fn(actual.createSession),
    deleteSession: vi.fn(actual.deleteSession),
  };
});

import * as actions from "@/lib/auth/actions";
import { login } from "@/lib/auth/actions";
import { createSession, deleteSession, verifySessionToken } from "@/lib/session";

const SECRET = "actions-test-secret-0123456789-abcdef"; // > 32 chars
const PASSWORD = "pw-Zx9-never-store-me";

function form(fields: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [name, value] of Object.entries(fields)) fd.append(name, value);
  return fd;
}

/** Runs an action and returns the URL it redirected to (the mock redirect throws). */
async function redirectedTo(action: () => Promise<void>): Promise<string | undefined> {
  try {
    await action();
  } catch (error) {
    if (error instanceof mocks.RedirectSignal) return error.url;
    throw error;
  }
  return undefined;
}

const consoleMethods = ["log", "info", "warn", "error", "debug", "trace"] as const;

describe("auth actions", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    mocks.cookieStore.get.mockReset();
    mocks.cookieStore.set.mockReset();
    mocks.cookieStore.delete.mockReset();
    mocks.redirect.mockClear();
    vi.mocked(createSession).mockClear();
    vi.mocked(deleteSession).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("R8: login calls createSession once with the trimmed username", async () => {
    await redirectedTo(() => login(form({ username: "  Ada Lovelace  ", password: PASSWORD })));
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith("Ada Lovelace");
  });

  it("R8: login sets a session cookie that verifies to the trimmed username", async () => {
    await redirectedTo(() => login(form({ username: "  ada ", password: PASSWORD })));
    expect(mocks.cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, token] = mocks.cookieStore.set.mock.calls[0];
    expect(name).toBe("session");
    await expect(verifySessionToken(token)).resolves.toMatchObject({ name: "ada" });
  });

  it("R8: login with no next redirects to / after creating the session", async () => {
    const url = await redirectedTo(() => login(form({ username: "ada", password: PASSWORD })));
    expect(url).toBe("/");
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/");
    expect(vi.mocked(createSession).mock.invocationCallOrder[0]).toBeLessThan(
      mocks.redirect.mock.invocationCallOrder[0],
    );
  });

  it("R8: login with next=/products/x redirects to /products/x", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: "ada", password: PASSWORD, next: "/products/x" })),
    );
    expect(url).toBe("/products/x");
    expect(mocks.redirect).toHaveBeenCalledWith("/products/x");
  });

  it("R8: login with next=//evil.com redirects to /", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: "ada", password: PASSWORD, next: "//evil.com" })),
    );
    expect(url).toBe("/");
  });

  it("R8: login with next=https://evil.com redirects to /", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: "ada", password: PASSWORD, next: "https://evil.com" })),
    );
    expect(url).toBe("/");
  });

  it("R8: login does not trim next before checking it (leading space is unsafe)", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: "ada", password: PASSWORD, next: " /products/x" })),
    );
    expect(url).toBe("/");
  });

  it("R8: login keeps the query string of a safe next", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: "ada", password: PASSWORD, next: "/products/x?y=1" })),
    );
    expect(url).toBe("/products/x?y=1");
  });

  it.each<[string, Record<string, string | File>]>([
    ["missing username", { password: PASSWORD }],
    ["missing password", { username: "ada" }],
    ["both missing", {}],
    ["empty username", { username: "", password: PASSWORD }],
    ["empty password", { username: "ada", password: "" }],
    ["whitespace-only username", { username: "   \t ", password: PASSWORD }],
    ["whitespace-only password", { username: "ada", password: "  \n " }],
    ["File as username", { username: new File(["ada"], "u.txt"), password: PASSWORD }],
    ["File as password", { username: "ada", password: new File([PASSWORD], "p.txt") }],
  ])("R9: login with %s redirects to /login?error=missing", async (_label, fields) => {
    const url = await redirectedTo(() => login(form(fields)));
    expect(url).toBe("/login?error=missing");
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
  });

  it.each<[string, Record<string, string | File>]>([
    ["missing username", { password: PASSWORD }],
    ["whitespace-only password", { username: "ada", password: "   " }],
    ["File as username", { username: new File(["ada"], "u.txt"), password: PASSWORD }],
  ])("R9: login with %s sets no cookie and creates no session", async (_label, fields) => {
    await redirectedTo(() => login(form(fields)));
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("R9: empty input with a safe next keeps next, URLSearchParams-encoded", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: " ", password: PASSWORD, next: "/products/x" })),
    );
    expect(url).toBe("/login?error=missing&next=%2Fproducts%2Fx");
  });

  it("R9: empty input with a safe next that has a query string encodes it with URLSearchParams", async () => {
    const next = "/products/x?y=1&z=2";
    const url = await redirectedTo(() => login(form({ username: "", password: "", next })));
    expect(url).toBe("/login?" + new URLSearchParams({ error: "missing", next }).toString());
  });

  it("R9: empty input with next=//evil.com drops next", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: "", password: PASSWORD, next: "//evil.com" })),
    );
    expect(url).toBe("/login?error=missing");
  });

  it("R9: empty input with next=https://evil.com drops next", async () => {
    const url = await redirectedTo(() =>
      login(form({ username: "ada", password: "", next: "https://evil.com" })),
    );
    expect(url).toBe("/login?error=missing");
  });

  it("R10: the password is not in the cookie value or the JWT payload", async () => {
    await redirectedTo(() => login(form({ username: "ada", password: PASSWORD })));
    const [, token, options] = mocks.cookieStore.set.mock.calls[0];
    expect(token).not.toContain(PASSWORD);
    expect(JSON.stringify(decodeJwt(token))).not.toContain(PASSWORD);
    expect(JSON.stringify(options)).not.toContain(PASSWORD);
  });

  it("R10: the password is not passed to createSession", async () => {
    await redirectedTo(() => login(form({ username: "ada", password: PASSWORD })));
    expect(JSON.stringify(vi.mocked(createSession).mock.calls)).not.toContain(PASSWORD);
  });

  it("R10: the password is not passed to redirect", async () => {
    await redirectedTo(() =>
      login(form({ username: "ada", password: PASSWORD, next: "/products/x" })),
    );
    expect(JSON.stringify(mocks.redirect.mock.calls)).not.toContain(PASSWORD);
  });

  it("R10: no console call receives the password, on success or on missing input", async () => {
    const spies = consoleMethods.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    await redirectedTo(() => login(form({ username: "ada", password: PASSWORD })));
    await redirectedTo(() => login(form({ username: " ", password: PASSWORD })));
    const calls = spies.map((spy) => spy.mock.calls.map((args) => args.map(String)));
    for (const spy of spies) spy.mockRestore();
    expect(JSON.stringify(calls)).not.toContain(PASSWORD);
  });

  // Phase 04-fix2 R10 (D-034): the logout server action is removed; sign-out is POST /logout.
  it("R10 (04-fix2): actions.ts exports only login", () => {
    expect(Object.keys(actions).sort()).toEqual(["login"]);
  });
});
