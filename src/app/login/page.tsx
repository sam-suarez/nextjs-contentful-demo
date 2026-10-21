import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert } from "@/components/alert";
import { ConfettiCluster } from "@/components/confetti";
import { SiteHeader } from "@/components/site-header";
import { BUTTON_PRIMARY, CARD_BASE, CONTAINER, LABEL, TEXT_LINK } from "@/components/ui-classes";
import { login } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/auth/next-path";
import { verifySession } from "@/lib/dal";

const INPUT = "min-h-12 rounded-lg border-2 border-input-border bg-input px-4 placeholder:text-muted-foreground focus:border-accent focus:shadow-pop-accent";

// Reads the session to redirect logged-in visitors to "/" before rendering the form (D-020).
export const instant = false;

export default async function LoginPage(props: PageProps<"/login">) {
  const { next: rawNext, error } = await props.searchParams;
  const next = safeNextPath(rawNext);

  const session = await verifySession();
  if (session) redirect("/");

  return (
    <>
      <SiteHeader variant="minimal" />
      <main className="flex-1">
        <div className={`${CONTAINER} relative flex flex-col items-center gap-6 py-12`}>
          <ConfettiCluster className="pointer-events-none absolute -top-2 left-4 hidden h-12 w-24 md:block" />
          <ConfettiCluster className="pointer-events-none absolute -bottom-2 right-4 hidden h-12 w-24 md:block" />

          <div className={`${CARD_BASE} sticker-member relative w-full max-w-md p-6 md:p-8`}>
            <h1 className="font-heading text-2xl font-extrabold">Sign in</h1>
            <p className="mt-2 text-muted-foreground">Sign in to see member prices and members-only toys.</p>
            <p className="mt-1 text-sm text-muted-foreground">This is a demo, so any username and password work.</p>

            {error === "missing" && (
              <div className="mt-4">
                <Alert>Enter a username and password to sign in.</Alert>
              </div>
            )}

            <form action={login} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className={LABEL}>
                  Username
                </label>
                <input id="username" name="username" placeholder="demo" required className={INPUT} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className={LABEL}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Any password"
                  required
                  className={INPUT}
                />
              </div>

              {next !== null && <input type="hidden" name="next" value={next} />}

              <button type="submit" className={`${BUTTON_PRIMARY} w-full`}>
                Sign in
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card text-accent-strong">
                  <ArrowRight aria-hidden="true" strokeWidth={2.5} className="h-4 w-4" />
                </span>
              </button>
            </form>
          </div>

          <Link href="/" className={TEXT_LINK}>
            Continue browsing without signing in
          </Link>
        </div>
      </main>
    </>
  );
}
