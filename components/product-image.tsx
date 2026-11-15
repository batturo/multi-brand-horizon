import Image from "next/image";
import { isSvg, productImageUrl } from "@/lib/catalog/images";
import type { ProductImage as Img } from "@/lib/types";

/** Product photo on a white square-ish area, sized for phones first. */
export function ProductImage({
  image,
  alt,
  sizes,
  eager = false,
  className = "",
}: {
  image: Img | undefined;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  if (!image) {
    return (
      <div className={`flex aspect-[4/5] items-center justify-center bg-white text-sm text-muted ${className}`}>
        No photo yet
      </div>
    );
  }
  const src = productImageUrl(image.src);
  return (
    <div className={`relative aspect-[4/5] bg-white ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain"
        unoptimized={isSvg(src)}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
      />
    </div>
  );
}
