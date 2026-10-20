import "server-only";
import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/next-path";

const safe = [
  "/products/x",
  "/",
  "/products/x?y=1",
  "/login?error=missing&next=%2Fproducts%2Fx",
  "/products/café",
  "/%2F%2Fevil.com",
];

const unsafeStrings: Array<[label: string, value: string]> = [
  ["protocol-relative //evil.com", "//evil.com"],
  ["backslash host /\\evil.com", "/\\evil.com"],
  ["absolute https://evil.com", "https://evil.com"],
  ["bare host evil.com", "evil.com"],
  ["empty string", ""],
  ["backslash inside /a\\b", "/a\\b"],
  ["newline inside /a\\nb", "/a\nb"],
  ["carriage return inside", "/a\rb"],
  ["tab inside", "/a\tb"],
  ["NUL inside", "/a\u0000b"],
  ["U+001F inside", "/a\u001fb"],
  ["DEL (U+007F) inside", "/a\u007fb"],
  ["leading space", " /products/x"],
  ["javascript: URL", "javascript:alert(1)"],
  ["triple slash", "///evil.com"],
];

const nonStrings: Array<[label: string, value: unknown]> = [
  ["undefined", undefined],
  ["null", null],
  ["number 42", 42],
  ["object", { path: "/" }],
  ["array", ["/"]],
];

describe("safeNextPath", () => {
  it.each(safe)("R7: returns the safe path %j unchanged", (value) => {
    expect(safeNextPath(value)).toBe(value);
  });

  it.each(unsafeStrings)("R7: returns null for %s", (_label, value) => {
    expect(safeNextPath(value)).toBeNull();
  });

  it.each(nonStrings)("R7: returns null for non-string %s", (_label, value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});
