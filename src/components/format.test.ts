import { describe, expect, it } from "vitest";
import {
  LOGGED_OUT_BANNER_TEXT,
  emptyStateMessage,
  formatPrice,
  formatSavings,
  formatToyCount,
  memberBannerText,
} from "@/components/format";
import mock from "@/data/products.mock.json";

describe("format", () => {
  it("R8: formatPrice formats 11.2 as $11.20", () => {
    expect(formatPrice(11.2)).toBe("$11.20");
  });

  it("R8: formatPrice formats a whole number with two decimals (9 -> $9.00)", () => {
    expect(formatPrice(9)).toBe("$9.00");
  });

  it("R8: formatPrice formats 71.2 as $71.20", () => {
    expect(formatPrice(71.2)).toBe("$71.20");
  });

  it("R8: formatPrice formats 0 as $0.00", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("R8: formatPrice groups thousands (1234.5 -> $1,234.50)", () => {
    expect(formatPrice(1234.5)).toBe("$1,234.50");
  });

  it("R8: formatPrice matches Intl en-US USD currency output for every mock price", () => {
    const intl = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    const amounts = mock.items.flatMap((e) => [e.fields.priceLoggedOut, e.fields.priceAuthenticated]);
    expect(amounts).toHaveLength(24);
    expect(amounts.map(formatPrice)).toEqual(amounts.map((a) => intl.format(a)));
  });

  it("R9: formatToyCount uses the plural for 0", () => {
    expect(formatToyCount(0)).toBe("0 toys");
  });

  it("R9: formatToyCount uses the singular for 1", () => {
    expect(formatToyCount(1)).toBe("1 toy");
  });

  it("R9: formatToyCount uses the plural for 2, 8 and 12", () => {
    expect([2, 8, 12].map(formatToyCount)).toEqual(["2 toys", "8 toys", "12 toys"]);
  });

  it("R9: memberBannerText(4) names 4 members-only toys", () => {
    expect(memberBannerText(4)).toBe("Member prices are on. You're also seeing 4 members-only toys.");
  });

  it("R9: memberBannerText(1) uses the singular", () => {
    expect(memberBannerText(1)).toBe("Member prices are on. You're also seeing 1 members-only toy.");
  });

  it("R9: memberBannerText(0) is only the first sentence", () => {
    expect(memberBannerText(0)).toBe("Member prices are on.");
  });

  it("R9: emptyStateMessage with a non-empty query suggests a different word", () => {
    expect(emptyStateMessage("zzz")).toBe("Try a different word or category.");
  });

  it("R9: emptyStateMessage treats a query that is non-empty after trimming as a search", () => {
    expect(emptyStateMessage("  soft  ")).toBe("Try a different word or category.");
  });

  it("R9: emptyStateMessage with an empty query names the category", () => {
    expect(emptyStateMessage("")).toBe("No toys in this category yet.");
  });

  it("R9: emptyStateMessage with a whitespace-only query names the category", () => {
    expect(emptyStateMessage("   \t ")).toBe("No toys in this category yet.");
  });

  it("R9: LOGGED_OUT_BANNER_TEXT is the exact logged-out banner sentence", () => {
    expect(LOGGED_OUT_BANNER_TEXT).toBe(
      "You're seeing everyday prices. Sign in to unlock member prices and members-only toys.",
    );
  });

  it("R9: banner strings use the straight apostrophe U+0027", () => {
    const texts = [LOGGED_OUT_BANNER_TEXT, memberBannerText(4), memberBannerText(1)];
    for (const text of texts) {
      expect(text).toContain("You're");
      expect(text).not.toMatch(/[‘’]/);
    }
  });

  it("P10 R2: formatSavings(20) is exactly You save 20%", () => {
    expect(formatSavings(20)).toBe("You save 20%");
  });

  it("P10 R2: formatSavings(5) is exactly You save 5% (no padding)", () => {
    expect(formatSavings(5)).toBe("You save 5%");
  });

  it("P10 R2: formatSavings(100) is exactly You save 100%", () => {
    expect(formatSavings(100)).toBe("You save 100%");
  });

  it("P10 R2: formatSavings uses plain ASCII spaces and percent sign (one verbatim string)", () => {
    expect(formatSavings(20)).toMatch(/^You save 20%$/);
    expect(formatSavings(20)).not.toMatch(/[^\x20-\x7e]/);
  });
});
