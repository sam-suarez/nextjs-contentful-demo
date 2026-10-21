import { Baby, Bath, Music, Puzzle, Rabbit, Shapes } from "lucide-react";
import { describe, expect, it } from "vitest";
import { CATEGORY_META, categoryLabel } from "@/components/categories";
import { CATEGORIES } from "@/schemas/product";

describe("categories", () => {
  it("R12: CATEGORY_META has exactly the six CATEGORIES as keys", () => {
    expect(Object.keys(CATEGORY_META).sort()).toEqual([...CATEGORIES].sort());
  });

  it("R12: each CATEGORY_META entry has exactly label, color and icon", () => {
    for (const category of CATEGORIES) {
      expect(Object.keys(CATEGORY_META[category]).sort()).toEqual(["color", "icon", "label"]);
    }
  });

  it("R12: rattles-teethers is Rattles & Teethers, secondary, Baby", () => {
    const meta = CATEGORY_META["rattles-teethers"];
    expect([meta.label, meta.color]).toEqual(["Rattles & Teethers", "secondary"]);
    expect(meta.icon).toBe(Baby);
  });

  it("R12: plush is Plush, accent, Rabbit", () => {
    const meta = CATEGORY_META.plush;
    expect([meta.label, meta.color]).toEqual(["Plush", "accent"]);
    expect(meta.icon).toBe(Rabbit);
  });

  it("R12: stacking-sorting is Stacking & Sorting, tertiary, Shapes", () => {
    const meta = CATEGORY_META["stacking-sorting"];
    expect([meta.label, meta.color]).toEqual(["Stacking & Sorting", "tertiary"]);
    expect(meta.icon).toBe(Shapes);
  });

  it("R12: bath is Bath, sky, Bath", () => {
    const meta = CATEGORY_META.bath;
    expect([meta.label, meta.color]).toEqual(["Bath", "sky"]);
    expect(meta.icon).toBe(Bath);
  });

  it("R12: activity-sensory is Activity & Sensory, quaternary, Puzzle", () => {
    const meta = CATEGORY_META["activity-sensory"];
    expect([meta.label, meta.color]).toEqual(["Activity & Sensory", "quaternary"]);
    expect(meta.icon).toBe(Puzzle);
  });

  it("R12: musical is Musical, tangerine, Music", () => {
    const meta = CATEGORY_META.musical;
    expect([meta.label, meta.color]).toEqual(["Musical", "tangerine"]);
    expect(meta.icon).toBe(Music);
  });

  it("R12: categoryLabel returns CATEGORY_META[c].label for every category", () => {
    expect(CATEGORIES.map(categoryLabel)).toEqual([
      "Rattles & Teethers",
      "Plush",
      "Stacking & Sorting",
      "Bath",
      "Activity & Sensory",
      "Musical",
    ]);
    for (const category of CATEGORIES) {
      expect(categoryLabel(category)).toBe(CATEGORY_META[category].label);
    }
  });
});
