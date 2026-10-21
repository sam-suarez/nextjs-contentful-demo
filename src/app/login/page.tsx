import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Alert } from "@/components/alert";
import { ConfettiCluster } from "@/components/confetti";
import { SiteHeader } from "@/components/site-header";
import { LoginCardSkeleton } from "@/components/skeletons";
import {
  BUTTON_PRIMARY,
  CONTAINER,
  FORM_FIELD,
  INPUT,
  LABEL,
  LOGIN_CARD_FRAME,
  LOGIN_FORM,
  LOGIN_INTRO,
  LOGIN_NOTE,
  LOGIN_TITLE_TEXT,
  TEXT_LINK,
} from "@/components/ui-classes";
import { login } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/auth/next-path";
import { verifySession } from "@/lib/dal";

// The minimal header and the page frame are static. The card reads searchParams (`next`, `error`)
// and the session, so it streams in behind Suspense with a same-size skeleton (D-031). A visitor
// with a valid session is normally sent to "/" by src/proxy.ts before rendering (D-032).
export default function LoginPage(props: PageProps<"/login">) {
  return (
    <>
      <SiteHeader variant="minimal" />
      <main className="flex-1">
        <div className={`${CONTAINER} relative flex flex-col items-center gap-6 py-12`}>
          <ConfettiCluster className="pointer-events-none absolute -top-2 left-4 hidden h-12 w-24 md:block" />
          <ConfettiCluster className="pointer-events-none absolute -bottom-2 right-4 hidden h-12 w-24 md:block" />

          <Suspense fallback={<LoginCardSkeleton />}>
            <LoginCard searchParams={props.searchParams} />
          </Suspense>

          <Link href="/" className={TEXT_LINK}>
            Continue browsing without signing in
          </Link>
        </div>
      </main>
    </>
  );
}

async function LoginCard({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext);

  const session = await verifySession();
  if (session) redirect("/");

  return (
    <div className={LOGIN_CARD_FRAME}>
      <h1 className={LOGIN_TITLE_TEXT}>Sign in</h1>
      <p className={`${LOGIN_INTRO} text-muted-foreground`}>Sign in to see member prices and members-only toys.</p>
      <p className={LOGIN_NOTE}>This is a demo, so any username and password work.</p>

      {error === "missing" && (
        <div className="mt-4">
          <Alert>Enter a username and password to sign in.</Alert>
        </div>
      )}

      <form action={login} className={LOGIN_FORM}>
        <div className={FORM_FIELD}>
          <label htmlFor="username" className={LABEL}>
            Username
          </label>
          <input id="username" name="username" placeholder="demo" required className={INPUT} />
        </div>

        <div className={FORM_FIELD}>
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <input id="password" name="password" type="password" placeholder="Any password" required className={INPUT} />
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
  );
}
