// Category label, colour token and icon (docs/design.md Category colour and icon).
import { Baby, Bath, Music, Puzzle, Rabbit, Shapes, type LucideIcon } from "lucide-react";

import type { Category } from "@/schemas/product";

export type CategoryColor = "secondary" | "accent" | "tertiary" | "sky" | "quaternary" | "tangerine";
export type CategoryMeta = { label: string; color: CategoryColor; icon: LucideIcon };

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  "rattles-teethers": { label: "Rattles & Teethers", color: "secondary", icon: Baby },
  plush: { label: "Plush", color: "accent", icon: Rabbit },
  "stacking-sorting": { label: "Stacking & Sorting", color: "tertiary", icon: Shapes },
  bath: { label: "Bath", color: "sky", icon: Bath },
  "activity-sensory": { label: "Activity & Sensory", color: "quaternary", icon: Puzzle },
  musical: { label: "Musical", color: "tangerine", icon: Music },
};

export function categoryLabel(category: Category): string {
  return CATEGORY_META[category].label;
}
