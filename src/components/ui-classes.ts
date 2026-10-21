// Shared Tailwind class strings. Literal strings only, so Tailwind's scanner sees every class.
import type { CategoryColor } from "@/components/categories";

export const CONTAINER = "mx-auto w-full max-w-6xl px-4 md:px-6";

export const LABEL = "text-label font-bold uppercase tracking-wide";

export const BUTTON_PRIMARY =
  "btn-pop inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-foreground bg-accent-strong px-6 font-bold text-white";

export const BUTTON_SECONDARY =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-foreground bg-transparent px-6 font-bold text-foreground transition-colors hover:bg-tertiary";

export const TEXT_LINK = "font-bold text-accent-strong underline decoration-2 underline-offset-2";

export const CARD_BASE = "rounded-xl border-2 border-foreground bg-card";

/** Per-colour utilities: fills, dot backdrop tint and the active-chip shadow. */
export const COLOR_CLASSES: Record<
  CategoryColor,
  { fill: string; svgFill: string; tint: string; activeShadow: string }
> = {
  secondary: {
    fill: "bg-secondary",
    svgFill: "fill-secondary",
    tint: "bg-secondary/10 [--tint:var(--color-secondary)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-secondary)]",
  },
  accent: {
    fill: "bg-accent",
    svgFill: "fill-accent",
    tint: "bg-accent/10 [--tint:var(--color-accent)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-accent)]",
  },
  tertiary: {
    fill: "bg-tertiary",
    svgFill: "fill-tertiary",
    tint: "bg-tertiary/10 [--tint:var(--color-tertiary)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-tertiary)]",
  },
  sky: {
    fill: "bg-sky",
    svgFill: "fill-sky",
    tint: "bg-sky/10 [--tint:var(--color-sky)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-sky)]",
  },
  quaternary: {
    fill: "bg-quaternary",
    svgFill: "fill-quaternary",
    tint: "bg-quaternary/10 [--tint:var(--color-quaternary)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-quaternary)]",
  },
  tangerine: {
    fill: "bg-tangerine",
    svgFill: "fill-tangerine",
    tint: "bg-tangerine/10 [--tint:var(--color-tangerine)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-tangerine)]",
  },
};
