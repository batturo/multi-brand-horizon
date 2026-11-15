import { ProductImage } from "@/components/product-image";
import { imageAlt } from "@/lib/catalog/images";
import type { ProductImage as Img } from "@/lib/types";

/**
 * Swipeable gallery using CSS scroll snap. No JavaScript: thumbnails are
 * links to each slide, so it works on any phone.
 */
export function ProductGallery({ images, title }: { images: Img[]; title: string }) {
  if (images.length <= 1) {
    return (
      <div className="overflow-hidden rounded border border-line">
        <ProductImage image={images[0]} alt={imageAlt(images[0], title)} sizes="(min-width: 768px) 50vw, 100vw" eager />
      </div>
    );
  }
  return (
    <div>
      <ul
        className="flex snap-x snap-mandatory overflow-x-auto rounded border border-line [scrollbar-width:none]"
        aria-label={`Photos of ${title}`}
      >
        {images.map((img, i) => (
          <li key={img.src} id={`photo-${i + 1}`} className="w-full shrink-0 snap-center">
            <ProductImage
              image={img}
              alt={imageAlt(img, `${title}, photo ${i + 1} of ${images.length}`)}
              sizes="(min-width: 768px) 50vw, 100vw"
              eager={i === 0}
            />
          </li>
        ))}
      </ul>
      <ul className="mt-2 flex gap-2 overflow-x-auto">
        {images.map((img, i) => (
          <li key={img.src} className="w-16 shrink-0">
            <a href={`#photo-${i + 1}`} className="block overflow-hidden rounded border border-line">
              <ProductImage image={img} alt={`Show photo ${i + 1}`} sizes="64px" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
