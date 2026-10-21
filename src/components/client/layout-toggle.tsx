"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createContext, use, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

import { parseCatalogParams, type CatalogLayout } from "@/components/catalog-params";
import { LAYOUT_OPTION } from "@/components/ui-classes";

// UI state only (D-019): the current layout. Cards, prices and Set B arrive as server `children`.
const LayoutContext = createContext<CatalogLayout | null>(null);

const OPTIONS: { value: CatalogLayout; label: string }[] = [
  { value: "price", label: "Price first" },
  { value: "specs", label: "Specs first" },
];

const noopSubscribe = () => () => {};

/** false in the server render and during hydration, true once mounted (no hydration mismatch). */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function useCurrentLayout(): CatalogLayout {
  const layout = use(LayoutContext);
  if (layout === null) throw new Error("LayoutGrid / LayoutToggle must be inside a LayoutProvider");
  return layout;
}

/**
 * Holds the current layout for the subtree. Renders no DOM element of its own.
 * The URL is the source of truth (R10): Next syncs `history.replaceState` with
 * `useSearchParams`, so a toggle and any later navigation both update it. The
 * server-validated `layout` prop is only the fallback when no search params exist.
 */
export function LayoutProvider({ layout, children }: { layout: CatalogLayout; children: ReactNode }) {
  const searchParams = useSearchParams();
  const current = searchParams ? parseCatalogParams({ layout: searchParams.get("layout") ?? undefined }).layout : layout;
  return <LayoutContext value={current}>{children}</LayoutContext>;
}

/** The grid wrapper: `group` + `data-layout` drive the `group-data-[layout=specs]:` utilities. */
export function LayoutGrid({ children }: { children: ReactNode }) {
  const current = useCurrentLayout();
  return (
    <div data-layout={current} className="group">
      {children}
    </div>
  );
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Segmented control. Server HTML: two links with `aria-current` (works without JS).
 * After mount: the same links with `role="button"` + `aria-pressed`; a plain left
 * click switches in place and replaces the URL, with no navigation and no refetch.
 */
export function LayoutToggle({ hrefs }: { hrefs: Record<CatalogLayout, string> }) {
  const current = useCurrentLayout();
  const mounted = useMounted();

  function onClick(event: MouseEvent<HTMLAnchorElement>, next: CatalogLayout) {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    if (next === current) return;
    window.history.replaceState(null, "", hrefs[next]);
  }

  return (
    <>
      {OPTIONS.map((option) => {
        const active = option.value === current;
        const state = mounted
          ? { role: "button" as const, "aria-pressed": active }
          : { "aria-current": active ? ("true" as const) : undefined };
        return (
          <Link
            key={option.value}
            href={hrefs[option.value]}
            prefetch={false}
            onClick={(event) => onClick(event, option.value)}
            {...state}
            className={`${LAYOUT_OPTION} ${
              active ? "border-foreground bg-card shadow-pop" : "border-transparent text-muted-foreground"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </>
  );
}
