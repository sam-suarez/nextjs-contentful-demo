import Link from "next/link";

import { ConfettiCluster } from "@/components/confetti";
import { SiteHeader } from "@/components/site-header";
import { BUTTON_PRIMARY, CONTAINER, LABEL } from "@/components/ui-classes";

// No props in this Next version (docs: not-found.md). Route-level: only this route needs
// toy-specific copy.
export default function ProductNotFound() {
  return (
    <>
      <SiteHeader variant="minimal" />
      <main className="flex-1">
        <div className={`${CONTAINER} relative flex flex-col items-center gap-4 py-16 text-center`}>
          <span className={`inline-flex items-center rounded-full border-2 border-foreground bg-tertiary px-4 py-1 ${LABEL}`}>
            404
          </span>
          <h1 className="font-heading text-title-sm leading-tight font-extrabold md:text-title">
            We can&apos;t find that toy
          </h1>
          <p className="text-muted-foreground">It may have been renamed or put back in the toy box.</p>
          <Link href="/" className={BUTTON_PRIMARY}>
            Back to catalog
          </Link>
          <ConfettiCluster className="hidden h-12 w-24 md:block" />
        </div>
      </main>
    </>
  );
}
