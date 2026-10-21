import Link from "next/link";

/** Three overlapping primitives (violet circle, pink triangle, yellow square) plus the wordmark. */
export function Logo() {
  return (
    <Link href="/" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full">
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className="pointer-events-none h-9 w-9 shrink-0 stroke-foreground"
        strokeWidth={2}
        strokeLinejoin="round"
      >
        <rect x="18" y="18" width="16" height="16" rx="2" className="fill-tertiary" />
        <circle cx="15" cy="15" r="10" className="fill-accent" />
        <path d="M22 6 L34 26 L10 26 Z" className="fill-secondary" />
      </svg>
      <span className="font-heading text-xl font-extrabold tracking-tight">Tiny Confetti</span>
    </Link>
  );
}
