import "server-only";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { savingsPercent } from "@/lib/products/savings";

// Typed through the spec contract, so a missing module is the only pre-build type error.
const percent = (everydayPrice: number, memberPrice: number): number | null => savingsPercent(everydayPrice, memberPrice);

const SOURCE = fileURLToPath(new URL("./savings.ts", import.meta.url));

/** Prices covering whole, decimal, tiny and large values (all finite, everyday > 0). */
const EVERYDAY = [0.01, 0.5, 1, 3, 7, 9, 9.99, 10, 11, 14, 28, 33.33, 89, 99.99, 100, 200, 1234.56];
const MEMBER = [0, 0.001, 0.01, 0.5, 1, 2, 2.5, 6.99, 7.2, 9.95, 10, 11.2, 22.4, 50, 71.2, 99.7, 100, 150, 1500];

describe("products/savings", () => {
  it('P09 R1: savings.ts starts with import "server-only";', () => {
    const firstLine = readFileSync(SOURCE, "utf8").split(/\r?\n/, 1)[0];
    expect(firstLine).toBe('import "server-only";');
  });

  it("P09 R1: savingsPercent(14, 11.2) → 20 (rounds 19.999…, not floor)", () => {
    expect(percent(14, 11.2)).toBe(20);
  });

  it("P09 R1: savingsPercent(28, 22.4) → 20", () => {
    expect(percent(28, 22.4)).toBe(20);
  });

  it("P09 R1: savingsPercent(89, 71.2) → 20", () => {
    expect(percent(89, 71.2)).toBe(20);
  });

  it("P09 R1: savingsPercent(3, 1) → 67 (nearest, not floor)", () => {
    expect(percent(3, 1)).toBe(67);
  });

  it("P09 R1: savingsPercent(3, 2) → 33", () => {
    expect(percent(3, 2)).toBe(33);
  });

  it("P09 R1: savingsPercent(200, 130) → 35", () => {
    expect(percent(200, 130)).toBe(35);
  });

  it("P09 R1: savingsPercent(10, 0) → 100 (formula with a free member price)", () => {
    expect(percent(10, 0)).toBe(100);
  });

  it("P09 R1: every mock price pair (member = 0.8 × everyday) → 20", () => {
    const pairs: Array<[number, number]> = [
      [14, 11.2],
      [28, 22.4],
      [89, 71.2],
      [54, 43.2],
      [16, 12.8],
      [68, 54.4],
      [12, 9.6],
      [24, 19.2],
      [36, 28.8],
      [32, 25.6],
      [11, 8.8],
      [9, 7.2],
    ];
    for (const [everyday, member] of pairs) expect(percent(everyday, member)).toBe(20);
  });

  it("P09 R1: a positive result equals Math.round((1 - member / everyday) * 100) across a price grid", () => {
    for (const everyday of EVERYDAY) {
      for (const member of MEMBER) {
        const formula = Math.round((1 - member / everyday) * 100);
        if (formula > 0) expect(percent(everyday, member), `${everyday}, ${member}`).toBe(formula);
      }
    }
  });

  it("P09 R2: savingsPercent(10, 10) → null (equal prices)", () => {
    expect(percent(10, 10)).toBeNull();
  });

  it("P09 R2: savingsPercent(10, 12) → null (member price higher)", () => {
    expect(percent(10, 12)).toBeNull();
  });

  it("P09 R2: savingsPercent(100, 99.7) → null (0.3% rounds to 0)", () => {
    expect(percent(100, 99.7)).toBeNull();
  });

  it("P09 R2: savingsPercent(100, 100.3) → null, not -0 (-0.3% rounds to -0)", () => {
    const result = percent(100, 100.3);
    expect(Object.is(result, -0)).toBe(false);
    expect(result).toBeNull();
  });

  it("P09 R2: savingsPercent(0, 0) → null (no NaN)", () => {
    expect(percent(0, 0)).toBeNull();
  });

  it("P09 R2: savingsPercent(0, 5) → null (no -Infinity)", () => {
    expect(percent(0, 5)).toBeNull();
  });

  it("P09 R2: an everyday price of -0 → null (savingsPercent(-0, 0), savingsPercent(-0, 5))", () => {
    expect(percent(-0, 0)).toBeNull();
    expect(percent(-0, 5)).toBeNull();
  });

  it("P09 R2: a negative everyday price → null (savingsPercent(-10, 5), savingsPercent(-10, -20))", () => {
    expect(percent(-10, 5)).toBeNull();
    expect(percent(-10, -20)).toBeNull();
  });

  it("P09 R2: a non-positive rounded value → null across a price grid", () => {
    for (const everyday of EVERYDAY) {
      for (const member of MEMBER) {
        const formula = Math.round((1 - member / everyday) * 100);
        if (formula <= 0) expect(percent(everyday, member), `${everyday}, ${member}`).toBeNull();
      }
    }
  });

  it("P09 R2: the result is always null or a positive whole number (never NaN, Infinity, -0 or a fraction)", () => {
    for (const everyday of [0, -0, -5, ...EVERYDAY]) {
      for (const member of MEMBER) {
        const result = percent(everyday, member);
        if (result === null) continue;
        expect(Number.isInteger(result), `${everyday}, ${member} → ${result}`).toBe(true);
        expect(result, `${everyday}, ${member}`).toBeGreaterThan(0);
        expect(Object.is(result, -0)).toBe(false);
      }
    }
  });
});
