import { describe, expect, it } from "vitest";
import {
  discountPercent,
  formatINR,
  lineTotal,
  orderTotals,
  savings,
  validatePrices,
} from "@/lib/pricing";

describe("discountPercent", () => {
  it("rounds down so the discount is never overstated", () => {
    expect(discountPercent(999, 449)).toBe(55); // 55.05%
    expect(discountPercent(3, 2)).toBe(33); // 33.33%
    expect(discountPercent(1000, 334)).toBe(66); // 66.6%
  });
  it("is exact for round numbers", () => {
    expect(discountPercent(2000, 1000)).toBe(50);
    expect(discountPercent(100, 1)).toBe(99);
  });
  it("is 0 when there is no discount", () => {
    expect(discountPercent(500, 500)).toBe(0);
    expect(discountPercent(500, 600)).toBe(0);
  });
  it("is 0 for invalid input", () => {
    expect(discountPercent(0, 100)).toBe(0);
    expect(discountPercent(100, 0)).toBe(0);
    expect(discountPercent(-5, 1)).toBe(0);
    expect(discountPercent(Number.NaN, 1)).toBe(0);
  });
});

describe("validatePrices", () => {
  it("accepts price at or below MRP", () => {
    expect(validatePrices(999, 449)).toEqual({ ok: true });
    expect(validatePrices(999, 999)).toEqual({ ok: true });
  });
  it("rejects price above MRP", () => {
    expect(validatePrices(500, 501).ok).toBe(false);
  });
  it("rejects zero, negative and fractional rupees", () => {
    expect(validatePrices(0, 0).ok).toBe(false);
    expect(validatePrices(100, -1).ok).toBe(false);
    expect(validatePrices(100.5, 50).ok).toBe(false);
  });
});

describe("savings and totals", () => {
  it("computes savings, never negative", () => {
    expect(savings(999, 449)).toBe(550);
    expect(savings(100, 120)).toBe(0);
  });
  it("adds lines and delivery fee", () => {
    const lines = [
      { unitPrice: 449, quantity: 2 },
      { unitPrice: 1199, quantity: 1 },
    ];
    expect(lineTotal(lines[0])).toBe(898);
    expect(orderTotals(lines, 50)).toEqual({ subtotal: 2097, deliveryFee: 50, total: 2147 });
  });
  it("treats an unset delivery fee as not added", () => {
    expect(orderTotals([{ unitPrice: 100, quantity: 1 }], null)).toEqual({
      subtotal: 100,
      deliveryFee: null,
      total: 100,
    });
  });
});

describe("formatINR", () => {
  it("uses Indian digit grouping and no decimals", () => {
    expect(formatINR(123456)).toBe("₹1,23,456");
    expect(formatINR(449)).toBe("₹449");
  });
});
