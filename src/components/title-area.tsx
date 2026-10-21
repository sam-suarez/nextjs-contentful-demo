import { Squiggle } from "@/components/confetti";
import { CONTAINER } from "@/components/ui-classes";

/** h1, pink squiggle, tagline; confetti and a big yellow circle sit to the right, md+ only. */
export function TitleArea() {
  return (
    <section className={`${CONTAINER} relative pt-10 pb-8 md:pt-14`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-6 hidden w-72 md:block">
        <div className="absolute top-6 right-10 h-40 w-40 rounded-full border-2 border-foreground bg-tertiary" />
        <svg
          viewBox="0 0 240 160"
          className="absolute inset-0 h-full w-full stroke-foreground"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <circle cx="24" cy="30" r="9" className="fill-sky" />
          <path d="M30 120 L44 96 L58 120 Z" className="fill-secondary" />
          <rect x="200" y="12" width="16" height="16" rx="3" className="fill-quaternary" transform="rotate(15 208 20)" />
          <path d="M150 146 q 8 -14 16 0 t 16 0 t 16 0" fill="none" className="stroke-tangerine" strokeWidth={5} />
          <circle cx="228" cy="120" r="6" className="fill-accent" />
        </svg>
      </div>

      <div className="relative max-w-xl">
        <h1 className="font-heading text-title-sm leading-tight font-extrabold md:text-title">Toy catalog</h1>
        <Squiggle className="mt-1 hidden h-4 w-48 md:block" />
        <p className="mt-3 text-lg text-muted-foreground">Bright, safe toys for little hands.</p>
      </div>
    </section>
  );
}
