import { formatPrice } from "@/components/format";
import { LABEL } from "@/components/ui-classes";
import type { PriceTier } from "@/lib/products/types";

/** Renders the one price the DAL chose; the tier only picks the label and colour. */
export function Price({ amount, tier, className = "" }: { amount: number; tier: PriceTier; className?: string }) {
  const member = tier === "member";
  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`${LABEL} ${member ? "text-accent-strong" : "text-muted-foreground"}`}>
        {member ? "Member price" : "Everyday price"}
      </span>
      <span
        className={`font-heading text-2xl font-extrabold tabular-nums ${member ? "text-accent-strong" : "text-foreground"}`}
      >
        {formatPrice(amount)}
      </span>
    </div>
  );
}
