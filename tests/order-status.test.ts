import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  allowedNextStatuses,
  canTransition,
  stockEffect,
} from "@/lib/orders/status";

describe("order status rules", () => {
  it("allows the normal flow", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "dispatched")).toBe(true);
    expect(canTransition("dispatched", "delivered")).toBe(true);
  });
  it("allows cancelling until delivered", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("dispatched", "cancelled")).toBe(true);
    expect(canTransition("delivered", "cancelled")).toBe(false);
  });
  it("treats delivered and cancelled as final", () => {
    expect(allowedNextStatuses("delivered")).toEqual([]);
    expect(allowedNextStatuses("cancelled")).toEqual([]);
  });
  it("does not skip steps", () => {
    expect(canTransition("pending", "dispatched")).toBe(false);
    expect(canTransition("pending", "delivered")).toBe(false);
  });
});

describe("stock effect", () => {
  it("takes stock only on confirm", () => {
    expect(stockEffect("pending", "confirmed", false)).toBe("take");
    expect(stockEffect("confirmed", "dispatched", true)).toBe("none");
    expect(stockEffect("dispatched", "delivered", true)).toBe("none");
  });
  it("returns stock when a confirmed order is cancelled", () => {
    expect(stockEffect("confirmed", "cancelled", true)).toBe("return");
    expect(stockEffect("dispatched", "cancelled", true)).toBe("return");
  });
  it("does nothing when a pending order is cancelled", () => {
    expect(stockEffect("pending", "cancelled", false)).toBe("none");
  });
  it("does nothing for invalid moves", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        if (!canTransition(from, to)) expect(stockEffect(from, to, true)).toBe("none");
      }
    }
  });
});
