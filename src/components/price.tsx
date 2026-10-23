import { SavingsBadge } from "@/components/badge";
import { formatPrice } from "@/components/format";
import { LABEL, PRICE_AMOUNT_TEXT, PRICE_SAVINGS_ROW, PRICE_STACK } from "@/components/ui-classes";
import type { PriceTier } from "@/lib/products/types";

/**
 * Renders the one price the DAL chose; the tier only picks the label and colour. The savings row
 * sits on its own line under the amount and is always rendered (D-036): it holds the pill for a
 * member price with a `savingsPercent` from the DAL, and is empty otherwise, so the block has the
 * same height in every state. In the catalog's Specs first layout the amount and the row are
 * right-aligned (group-data utility; the grid wrapper carries `data-layout`).
 */
export function Price({
  amount,
  tier,
  savingsPercent,
  className = "",
}: {
  amount: number;
  tier: PriceTier;
  savingsPercent: number | null;
  className?: string;
}) {
  const member = tier === "member";
  const showSavings = member && savingsPercent !== null;
  return (
    <div className={`${PRICE_STACK} ${className}`}>
      <span className={`${LABEL} ${member ? "text-accent-strong" : "text-muted-foreground"}`}>
        {member ? "Member price" : "Everyday price"}
      </span>
      <div className="flex flex-col group-data-[layout=specs]:items-end">
        <span data-price-amount className={`${PRICE_AMOUNT_TEXT} ${member ? "text-accent-strong" : "text-foreground"}`}>
          {formatPrice(amount)}
        </span>
        <div data-savings-row className={PRICE_SAVINGS_ROW}>
          {showSavings && <SavingsBadge percent={savingsPercent} />}
        </div>
      </div>
    </div>
  );
}
