import "server-only";
import { SignJWT, UnsecuredJWT, base64url, decodeJwt, decodeProtectedHeader } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSession,
  deleteSession,
  signSession,
  verifySessionToken,
} from "@/lib/session";

const SECRET = "test-secret-0123456789-abcdefghijklmnop"; // > 32 chars
const OTHER_SECRET = "another-secret-0123456789-abcdefghijk";
const key = (secret: string) => new TextEncoder().encode(secret);
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Calls fn and returns what it threw or rejected with (sync throws count too). */
async function caught(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

/** Replaces the character at index i of s with a different base64url character. */
function flipChar(s: string, i: number): string {
  const replacement = s[i] === "A" ? "B" : "A";
  return s.slice(0, i) + replacement + s.slice(i + 1);
}

describe("session", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
    cookieStore.delete.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("contract: exports the cookie name and a 7-day TTL", () => {
    expect(SESSION_COOKIE).toBe("session");
    expect(SESSION_TTL_SECONDS).toBe(604800);
  });

  it("R1: signSession returns a token verifySessionToken accepts with the same name", async () => {
    const token = await signSession("Ada Lovelace");
    const session = await verifySessionToken(token);
    expect(session?.name).toBe("Ada Lovelace");
  });

  it("R1: the verified session's expiresAt is a Date 7 days (+-60 s) after signing", async () => {
    const signedAt = Date.now();
    const session = await verifySessionToken(await signSession("ada"));
    expect(session?.expiresAt).toBeInstanceOf(Date);
    const expected = signedAt + SESSION_TTL_SECONDS * 1000;
    expect(Math.abs(session!.expiresAt.getTime() - expected)).toBeLessThanOrEqual(60_000);
  });

  it("R1: the token is an HS256 JWT verifiable with the SESSION_SECRET bytes", async () => {
    const token = await signSession("ada");
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, key(SECRET), { algorithms: ["HS256"] });
    expect(payload.name).toBe("ada");
  });

  it("R2: the JWT payload holds exactly the claims name and exp", async () => {
    const payload = decodeJwt(await signSession("ada"));
    expect(Object.keys(payload).sort()).toEqual(["exp", "name"]);
    expect(payload.name).toBe("ada");
    expect(typeof payload.exp).toBe("number");
  });

  it("R2: the protected header is { alg: HS256 }", async () => {
    const header = decodeProtectedHeader(await signSession("ada"));
    expect(header).toEqual({ alg: "HS256" });
  });

  it("R3: verifySessionToken returns null for undefined", async () => {
    await expect(verifySessionToken(undefined)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for an empty string", async () => {
    await expect(verifySessionToken("")).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for non-JWT strings", async () => {
    for (const value of ["not-a-jwt", "a.b.c", "....", "session=abc", "eyJhbGciOiJIUzI1NiJ9"]) {
      await expect(verifySessionToken(value)).resolves.toBeNull();
    }
  });

  it("R3: verifySessionToken returns null when any payload character is changed", async () => {
    const token = await signSession("ada");
    const [header, payload, signature] = token.split(".");
    // The last character can carry only padding bits, so it is skipped.
    for (let i = 0; i < payload.length - 1; i++) {
      const tampered = [header, flipChar(payload, i), signature].join(".");
      await expect(verifySessionToken(tampered)).resolves.toBeNull();
    }
  });

  it("R3: verifySessionToken returns null when the payload is swapped for another name", async () => {
    const token = await signSession("ada");
    const [header, payload, signature] = token.split(".");
    const claims = decodeJwt(token);
    const forged = base64url.encode(JSON.stringify({ ...claims, name: "mallory" }));
    expect(forged).not.toBe(payload);
    await expect(verifySessionToken([header, forged, signature].join("."))).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null when any signature character is changed", async () => {
    const token = await signSession("ada");
    const [header, payload, signature] = token.split(".");
    for (let i = 0; i < signature.length - 1; i++) {
      const tampered = [header, payload, flipChar(signature, i)].join(".");
      await expect(verifySessionToken(tampered)).resolves.toBeNull();
    }
  });

  it("R3: verifySessionToken returns null for a token signed with a different secret", async () => {
    const token = await new SignJWT({ name: "ada" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(nowSeconds() + 3600)
      .sign(key(OTHER_SECRET));
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for a token whose exp is in the past", async () => {
    const token = await new SignJWT({ name: "ada" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(nowSeconds() - 3600)
      .sign(key(SECRET));
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for an HS512 token signed with the same secret", async () => {
    const token = await new SignJWT({ name: "ada" })
      .setProtectedHeader({ alg: "HS512" })
      .setExpirationTime(nowSeconds() + 3600)
      .sign(key(SECRET));
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for an HS384 token signed with the same secret", async () => {
    const token = await new SignJWT({ name: "ada" })
      .setProtectedHeader({ alg: "HS384" })
      .setExpirationTime(nowSeconds() + 3600)
      .sign(key(SECRET));
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for an unsecured (alg none) token", async () => {
    const token = new UnsecuredJWT({ name: "ada" }).setExpirationTime(nowSeconds() + 3600).encode();
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for a valid HS256 token with no name claim", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(nowSeconds() + 3600)
      .sign(key(SECRET));
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for a valid HS256 token with an empty name", async () => {
    const token = await new SignJWT({ name: "" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(nowSeconds() + 3600)
      .sign(key(SECRET));
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("R3: verifySessionToken returns null for a valid HS256 token whose name is not a string", async () => {
    for (const name of [42, true, null, ["ada"], { first: "ada" }]) {
      const token = await new SignJWT({ name })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(nowSeconds() + 3600)
        .sign(key(SECRET));
      await expect(verifySessionToken(token)).resolves.toBeNull();
    }
  });

  it("R4: signSession throws an Error mentioning SESSION_SECRET when it is unset", async () => {
    delete process.env.SESSION_SECRET;
    const error = await caught(() => signSession("ada"));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("SESSION_SECRET");
  });

  it("R4: signSession throws an Error mentioning SESSION_SECRET when it is empty", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const error = await caught(() => signSession("ada"));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("SESSION_SECRET");
  });

  it("R4: signSession throws an Error mentioning SESSION_SECRET when it is 31 characters", async () => {
    vi.stubEnv("SESSION_SECRET", "x".repeat(31));
    const error = await caught(() => signSession("ada"));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("SESSION_SECRET");
  });

  it("R4: verifySessionToken throws an Error mentioning SESSION_SECRET when it is unset", async () => {
    const token = await signSession("ada");
    delete process.env.SESSION_SECRET;
    const error = await caught(() => verifySessionToken(token));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("SESSION_SECRET");
  });

  it("R4: verifySessionToken throws an Error mentioning SESSION_SECRET when it is empty", async () => {
    const token = await signSession("ada");
    vi.stubEnv("SESSION_SECRET", "");
    const error = await caught(() => verifySessionToken(token));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("SESSION_SECRET");
  });

  it("R4: verifySessionToken throws an Error mentioning SESSION_SECRET when it is 31 characters", async () => {
    const token = await signSession("ada");
    vi.stubEnv("SESSION_SECRET", "x".repeat(31));
    const error = await caught(() => verifySessionToken(token));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("SESSION_SECRET");
  });

  it("R4: a SESSION_SECRET of exactly 32 characters is accepted", async () => {
    vi.stubEnv("SESSION_SECRET", "y".repeat(32));
    const session = await verifySessionToken(await signSession("ada"));
    expect(session?.name).toBe("ada");
  });

  it("R4: SESSION_SECRET is read on every call, not once at module load", async () => {
    await signSession("ada");
    delete process.env.SESSION_SECRET;
    const error = await caught(() => signSession("ada"));
    expect(error).toBeInstanceOf(Error);
    vi.stubEnv("SESSION_SECRET", OTHER_SECRET);
    const token = await signSession("ada");
    const { jwtVerify } = await import("jose");
    await expect(jwtVerify(token, key(OTHER_SECRET), { algorithms: ["HS256"] })).resolves.toBeDefined();
  });

  it("R4: a module loaded without SESSION_SECRET works once it is set", async () => {
    vi.resetModules();
    delete process.env.SESSION_SECRET;
    const fresh = await import("@/lib/session");
    vi.stubEnv("SESSION_SECRET", SECRET);
    const session = await fresh.verifySessionToken(await fresh.signSession("ada"));
    expect(session?.name).toBe("ada");
  });

  it("R5: createSession sets the session cookie exactly once", async () => {
    await createSession("ada");
    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    expect(cookieStore.set.mock.calls[0][0]).toBe("session");
  });

  it("R5: createSession's cookie value verifies to the given name", async () => {
    await createSession("Grace Hopper");
    const token = cookieStore.set.mock.calls[0][1];
    const session = await verifySessionToken(token);
    expect(session?.name).toBe("Grace Hopper");
  });

  it("R5: createSession passes exactly the spec'd cookie options (non-production)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    await createSession("ada");
    const [, token, options] = cookieStore.set.mock.calls[0];
    const session = await verifySessionToken(token);
    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: session!.expiresAt,
    });
    expect(options.expires).toBeInstanceOf(Date);
    expect(options.expires.getTime()).toBe(session!.expiresAt.getTime());
  });

  it("R5: createSession sets secure: true when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("ada");
    const [, token, options] = cookieStore.set.mock.calls[0];
    const session = await verifySessionToken(token);
    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: session!.expiresAt,
    });
  });

  it("R6: deleteSession deletes the session cookie exactly once", async () => {
    await deleteSession();
    expect(cookieStore.delete).toHaveBeenCalledTimes(1);
    expect(cookieStore.delete).toHaveBeenCalledWith("session");
  });
});
