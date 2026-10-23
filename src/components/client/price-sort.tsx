"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Children, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

import { parseCatalogParams, type CatalogSort } from "@/components/catalog-params";
import { LAYOUT_OPTION, SORT_OPTION_SIZE } from "@/components/ui-classes";

// UI state only (D-019, D-038): the current sort and, per option, the card order as indices into
// the server-rendered cards. Prices, names and Set B never reach this file; the cards arrive as
// server `children`.

const OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "price-asc", label: "Low to high" },
  { value: "price-desc", label: "High to low" },
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

/**
 * The URL is the source of truth, as in LayoutProvider: Next syncs `history.replaceState` with
 * `useSearchParams`, so the toggle and the cards agree without shared state. `fallback` is used
 * only when no search params exist.
 */
function useCurrentSort(fallback: CatalogSort | null): CatalogSort | null {
  const searchParams = useSearchParams();
  return searchParams ? parseCatalogParams({ sort: searchParams.get("sort") ?? undefined }).sort : fallback;
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Segmented control "Price". Server HTML: two links with `aria-current` (works without JS; the
 * server renders the grid in that order). After mount: the same links with `role="button"` +
 * `aria-pressed`; a plain left click on the inactive option replaces the URL with no request, and
 * PriceSortedCards follows. A click on the active option does nothing.
 */
export function PriceSortToggle({ hrefs }: { hrefs: Record<CatalogSort, string> }) {
  const current = useCurrentSort(null);
  const mounted = useMounted();

  function onClick(event: MouseEvent<HTMLAnchorElement>, next: CatalogSort) {
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
            className={`${LAYOUT_OPTION} ${SORT_OPTION_SIZE} ${
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

/**
 * Renders the server-rendered cards in the current sort's order, with no DOM element of its own
 * (the cards stay direct children of the grid). Reordering goes through React: the keyed children
 * are re-indexed, so React moves the existing card nodes and DOM and focus order follow. The
 * orders were computed on the list as rendered, so the server's own sort is the identity order.
 * With no sort, or an order that does not match the children, the children keep their order.
 */
export function PriceSortedCards({
  sort,
  orders,
  children,
}: {
  sort: CatalogSort | null;
  orders: Record<CatalogSort, number[]>;
  children: ReactNode;
}) {
  const current = useCurrentSort(sort);
  // Always the same keyed array (keys from Children.toArray), so switching between "no sort" and
  // a sort moves the existing elements instead of remounting them.
  const items = Children.toArray(children);
  const order = current === null ? null : orders[current];
  if (order === null || order.length !== items.length) return <>{items}</>;
  return <>{order.map((index) => items[index])}</>;
}
