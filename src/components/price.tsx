import { formatPrice } from "@/components/format";
import { LABEL, PRICE_AMOUNT_TEXT, PRICE_STACK } from "@/components/ui-classes";
import type { PriceTier } from "@/lib/products/types";

/** Renders the one price the DAL chose; the tier only picks the label and colour. */
export function Price({ amount, tier, className = "" }: { amount: number; tier: PriceTier; className?: string }) {
  const member = tier === "member";
  return (
    <div className={`${PRICE_STACK} ${className}`}>
      <span className={`${LABEL} ${member ? "text-accent-strong" : "text-muted-foreground"}`}>
        {member ? "Member price" : "Everyday price"}
      </span>
      <span className={`${PRICE_AMOUNT_TEXT} ${member ? "text-accent-strong" : "text-foreground"}`}>
        {formatPrice(amount)}
      </span>
    </div>
  );
}
