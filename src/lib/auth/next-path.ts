import "server-only";

/** Returns `value` if it is a safe same-origin relative path (R7), else null. */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  // "//host" and "/\host" are protocol-relative to browsers.
  if (value[1] === "/" || value[1] === "\\") return null;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // Backslash, ASCII control characters (U+0000-U+001F) and DEL (U+007F).
    if (code === 0x5c || code <= 0x1f || code === 0x7f) return null;
  }
  return value;
}
