import { ImageOff } from "lucide-react";
import Image from "next/image";

import { CATEGORY_META } from "@/components/categories";
import { COLOR_CLASSES } from "@/components/ui-classes";
import type { ProductImage } from "@/lib/products/types";
import type { Category } from "@/schemas/product";

const SQUARE = "rounded-lg";
const BLOB = "rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none";

/**
 * Square frame on a category-tinted dot backdrop, or the placeholder when `image` is null.
 * `className` lets the catalog card resize it and switch to the blob radius per layout.
 */
export function ProductImageFrame({
  image,
  name,
  category,
  shape = "square",
  className = "",
}: {
  image: ProductImage | null;
  name: string;
  category: Category;
  shape?: "square" | "blob";
  className?: string;
}) {
  const radius = shape === "blob" ? BLOB : SQUARE;

  if (!image) {
    return (
      <div
        className={`flex aspect-square w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-input-border bg-muted p-3 text-center ${radius} ${className}`}
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-input-border bg-card text-muted-foreground">
          <ImageOff aria-hidden="true" strokeWidth={2.5} className="h-6 w-6" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">{"Picture coming soon"}</span>
      </div>
    );
  }

  const tint = COLOR_CLASSES[CATEGORY_META[category].color].tint;
  return (
    <div className={`tint-dots aspect-square w-full overflow-hidden border-2 border-foreground ${tint} ${radius} ${className}`}>
      <Image
        src={image.url}
        alt={name}
        width={image.width ?? 400}
        height={image.height ?? 400}
        unoptimized
        className="h-full w-full object-contain"
      />
    </div>
  );
}
