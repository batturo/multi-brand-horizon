import { discountPercent, formatINR } from "@/lib/pricing";

/** Price, MRP struck through and percent off. Screen readers get one clear sentence. */
export function Price({
  price,
  mrp,
  size = "md",
}: {
  price: number;
  mrp: number;
  size?: "md" | "lg";
}) {
  const off = discountPercent(mrp, price);
  const big = size === "lg";
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="sr-only">
        Price {formatINR(price)}
        {off > 0 ? `, MRP ${formatINR(mrp)}, ${off}% off` : ""}
      </span>
      <span aria-hidden="true" className={big ? "text-2xl font-bold" : "text-base font-bold"}>
        {formatINR(price)}
      </span>
      {off > 0 && (
        <>
          <span aria-hidden="true" className={`text-muted ${big ? "text-base" : "text-sm"}`}>
            MRP <s>{formatINR(mrp)}</s>
          </span>
          <span aria-hidden="true" className={`font-semibold text-gold-deep ${big ? "text-base" : "text-sm"}`}>
            {off}% off
          </span>
        </>
      )}
    </p>
  );
}
