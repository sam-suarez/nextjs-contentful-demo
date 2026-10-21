import { CONTAINER } from "@/components/ui-classes";

/** White strip under the header; `text` is one string so it stays one text node. */
export function Banner({ text }: { text: string }) {
  return (
    <div className="border-b-2 border-border bg-card">
      <p className={`${CONTAINER} py-3 text-sm font-medium`}>{text}</p>
    </div>
  );
}
