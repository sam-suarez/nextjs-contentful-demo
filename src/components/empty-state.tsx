import Link from "next/link";

import { ConfettiCluster } from "@/components/confetti";
import { emptyStateMessage } from "@/components/format";
import { BUTTON_SECONDARY, CARD_BASE } from "@/components/ui-classes";

export function EmptyState({ q }: { q: string }) {
  return (
    <div className={`${CARD_BASE} sticker flex flex-col items-center gap-4 px-6 py-12 text-center`}>
      <ConfettiCluster className="hidden h-12 w-24 md:block" />
      <h2 className="font-heading text-2xl font-bold">No toys match your search</h2>
      <p className="text-muted-foreground">{emptyStateMessage(q)}</p>
      <Link href="/" className={BUTTON_SECONDARY}>
        Clear filters
      </Link>
    </div>
  );
}
