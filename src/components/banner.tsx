import { BANNER_FRAME, BANNER_INNER, CONTAINER } from "@/components/ui-classes";

/**
 * White strip under the header; `text` is one string so it stays one text node. Frame and min
 * height are shared with BannerSkeleton, so the swap does not move the title area below.
 */
export function Banner({ text }: { text: string }) {
  return (
    <div className={BANNER_FRAME}>
      <p className={`${CONTAINER} ${BANNER_INNER}`}>{text}</p>
    </div>
  );
}
