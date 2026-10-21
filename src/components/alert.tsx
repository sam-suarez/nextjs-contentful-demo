import type { ReactNode } from "react";

/** docs/design.md Components: Alert — 2px foreground border, bg-secondary/20, rounded-lg. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border-2 border-foreground bg-secondary/20 p-3 text-sm font-medium">
      {children}
    </div>
  );
}
