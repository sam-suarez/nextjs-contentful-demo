// Decorative primitives. Always aria-hidden and pointer-events-none.

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 16"
      fill="none"
      className={`pointer-events-none stroke-secondary ${className}`}
      strokeWidth={4}
      strokeLinecap="round"
    >
      <path d="M2 8 Q 14.5 0 27 8 T 52 8 T 77 8 T 102 8 T 127 8 T 152 8 T 177 8 T 198 8" />
    </svg>
  );
}

/** A circle, a triangle and a squiggle in rotating confetti colours. */
export function ConfettiCluster({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 64"
      className={`pointer-events-none stroke-foreground ${className}`}
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <circle cx="18" cy="36" r="12" className="fill-accent" />
      <path d="M48 52 L62 24 L76 52 Z" className="fill-tertiary" />
      <path d="M88 40 q 6 -12 12 0 t 12 0" fill="none" className="stroke-quaternary" strokeWidth={5} />
    </svg>
  );
}
