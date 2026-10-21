import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { MemberPricingBadge } from "@/components/badge";
import { Logo } from "@/components/logo";
import { HeaderSessionSkeleton } from "@/components/skeletons";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CONTAINER, HEADER_SESSION_SLOT, TEXT_LINK } from "@/components/ui-classes";
import { verifySession } from "@/lib/dal";

/**
 * `session`: for / and /products/[slug]. The frame and logo are static; only the session controls
 * read the session (through the DAL), inside a Suspense boundary with a same-size skeleton (D-031).
 * `minimal`: for /login and not-found; never reads the session, no boundary.
 */
export function SiteHeader({ variant }: { variant: "session" | "minimal" }) {
  return (
    <header className="border-b-2 border-foreground">
      <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-3 py-3`}>
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
 * Both states fill the same fixed-height slot (HEADER_SESSION_SLOT) as the skeleton. Logged in,
 * the badge sits above the name below `md` (one 48 px row with Sign out) and the name is
 * truncated, so a long name never adds a line.
 */
async function SessionControls() {
  const session = await verifySession();

  if (!session) {
    return (
      <div className={`${HEADER_SESSION_SLOT} justify-end`}>
        <Link href="/login" className={BUTTON_PRIMARY}>
          Sign in
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card text-accent-strong">
            <ArrowRight aria-hidden="true" strokeWidth={2.5} className="h-4 w-4" />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className={HEADER_SESSION_SLOT}>
      <div className="flex min-w-0 flex-1 flex-col items-start md:flex-row md:items-center md:gap-3">
        <MemberPricingBadge />
        <p className="max-w-full truncate text-sm md:max-w-56">
          Signed in as <strong className="font-bold">{session.name}</strong>
        </p>
      </div>
      <form method="post" action="/logout" className="shrink-0">
        <button type="submit" className={BUTTON_SECONDARY}>
          Sign out
        </button>
      </form>
    </div>
  );
}
