import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { MemberPricingBadge } from "@/components/badge";
import { Logo } from "@/components/logo";
import { HeaderSessionSkeleton } from "@/components/skeletons";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  CONTAINER,
  HEADER_BUTTON_COMPACT,
  HEADER_NARROW_HIDDEN,
  HEADER_SESSION_SLOT,
  TEXT_LINK,
} from "@/components/ui-classes";
import { verifySession } from "@/lib/dal";

/**
 * `session`: for / and /products/[slug]. The frame and logo are static; only the session controls
 * read the session (through the DAL), inside a Suspense boundary with a same-size skeleton (D-031).
 * `minimal`: for /login and not-found; never reads the session, no boundary.
 */
export function SiteHeader({ variant }: { variant: "session" | "minimal" }) {
  return (
    <header className="border-b-2 border-foreground">
      <div className={`${CONTAINER} flex items-center justify-between gap-3 py-3`}>
        <Logo />
        {variant === "minimal" ? (
          <Link href="/" className={TEXT_LINK}>
            Back to catalog
          </Link>
        ) : (
          <Suspense fallback={<HeaderSessionSkeleton />}>
            <SessionControls />
          </Suspense>
        )}
      </div>
    </header>
  );
}

/**
 * Both states fill the same fixed-height slot (HEADER_SESSION_SLOT) beside the logo, like the
 * skeleton. Logged in, below `md` the badge and name are visually hidden (still read by screen
 * readers) and a member avatar with the name's initial stands in for them; from `md` they show
 * in one row and a long name is truncated, so it never adds a line.
 */
async function SessionControls() {
  const session = await verifySession();

  if (!session) {
    return (
      <div className={HEADER_SESSION_SLOT}>
        <Link href="/login" className={`${BUTTON_PRIMARY} ${HEADER_BUTTON_COMPACT}`}>
          Sign in
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-card text-accent-strong ${HEADER_NARROW_HIDDEN}`}>
            <ArrowRight aria-hidden="true" strokeWidth={2.5} className="h-4 w-4" />
          </span>
        </Link>
      </div>
    );
  }

  const initial = Array.from(session.name.trim())[0]?.toUpperCase() ?? "?";

  return (
    <div className={HEADER_SESSION_SLOT}>
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-tertiary font-heading text-lg font-extrabold md:hidden ${HEADER_NARROW_HIDDEN}`}
      >
        {initial}
      </span>
      <div className="sr-only md:not-sr-only md:flex md:min-w-0 md:items-center md:gap-3">
        <MemberPricingBadge />
        <p className="truncate text-sm md:max-w-56">
          Signed in as <strong className="font-bold">{session.name}</strong>
        </p>
      </div>
      <form method="post" action="/logout" className="shrink-0">
        <button type="submit" className={`${BUTTON_SECONDARY} ${HEADER_BUTTON_COMPACT}`}>
          Sign out
        </button>
      </form>
    </div>
  );
}
