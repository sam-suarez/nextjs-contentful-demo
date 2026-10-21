import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { MemberPricingBadge } from "@/components/badge";
import { Logo } from "@/components/logo";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CONTAINER, TEXT_LINK } from "@/components/ui-classes";
import { logout } from "@/lib/auth/actions";
import { verifySession } from "@/lib/dal";

/**
 * `session`: for routes that export `instant = false` (reads the session through the DAL).
 * `minimal`: for /login and not-found; never reads the session.
 */
export async function SiteHeader({ variant }: { variant: "session" | "minimal" }) {
  return (
    <header className="border-b-2 border-foreground">
      <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-3 py-3`}>
        <Logo />
        {variant === "minimal" ? (
          <Link href="/" className={TEXT_LINK}>
            Back to catalog
          </Link>
        ) : (
          <SessionControls />
        )}
      </div>
    </header>
  );
}

async function SessionControls() {
  const session = await verifySession();

  if (!session) {
    return (
      <Link href="/login" className={BUTTON_PRIMARY}>
        Sign in
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card text-accent-strong">
          <ArrowRight aria-hidden="true" strokeWidth={2.5} className="h-4 w-4" />
        </span>
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <MemberPricingBadge />
      <p className="text-sm">
        Signed in as <strong className="font-bold">{session.name}</strong>
      </p>
      <form action={logout}>
        <button type="submit" className={BUTTON_SECONDARY}>
          Sign out
        </button>
      </form>
    </div>
  );
}
