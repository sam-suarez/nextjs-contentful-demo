import { CONTAINER } from "@/components/ui-classes";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-border bg-card">
      <div
        className={`${CONTAINER} flex flex-col gap-2 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between`}
      >
        <p>{"Tiny Confetti demo catalog"}</p>
        <p>{"Prices in USD. Member prices need sign-in."}</p>
      </div>
    </footer>
  );
}
