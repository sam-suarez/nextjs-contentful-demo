import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 604800

export type Session = { name: string; expiresAt: Date };

const MIN_SECRET_LENGTH = 32;

/** Reads SESSION_SECRET on every call (never cached at module load) and returns the HS256 key bytes. */
function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters (generate one with: openssl rand -base64 32)`,
    );
  }
  return new TextEncoder().encode(secret);
}

/** Signs the token and returns it with the exact expiry encoded in its `exp` claim. */
async function sign(name: string): Promise<{ token: string; expiresAt: Date }> {
  const key = secretKey();
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await new SignJWT({ name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(key);
  return { token, expiresAt: new Date(exp * 1000) };
}

/** Signs { name } with HS256 and exp = now + SESSION_TTL_SECONDS. Throws if SESSION_SECRET is missing/short. */
export async function signSession(name: string): Promise<string> {
  return (await sign(name)).token;
}

/** Returns the session, or null for any missing/invalid/expired/wrong-alg token. Throws only if SESSION_SECRET is missing/short. */
export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  const key = secretKey();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      requiredClaims: ["exp"],
    });
    const { name, exp } = payload;
    if (typeof name !== "string" || name.length === 0 || typeof exp !== "number") return null;
    return { name, expiresAt: new Date(exp * 1000) };
  } catch {
    return null;
  }
}

/** Signs a token for `name` and sets the `session` cookie (options in R5). */
export async function createSession(name: string): Promise<void> {
  const { token, expiresAt } = await sign(name);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Deletes the `session` cookie. */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
