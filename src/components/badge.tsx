import { Sparkles } from "lucide-react";

const BADGE =
  "inline-flex items-center gap-1 rounded-full border-2 border-foreground px-2.5 py-0.5 text-label font-bold";

export function MembersOnlyBadge() {
  return (
    <span className={`${BADGE} bg-secondary text-foreground`}>
      <Sparkles aria-hidden="true" strokeWidth={2.5} className="h-3.5 w-3.5" />
      Members only
    </span>
  );
}

export function MemberPricingBadge() {
  return <span className={`${BADGE} bg-tertiary text-foreground`}>Member pricing</span>;
}
