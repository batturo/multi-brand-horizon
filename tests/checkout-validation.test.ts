import { describe, expect, it } from "vitest";
import { normalizeIndianMobile, normalizePincode, validateCheckout } from "@/lib/orders/validate";

describe("normalizeIndianMobile", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["98765 43210", "9876543210"],
    ["+91 98765-43210", "9876543210"],
    ["+919876543210", "9876543210"],
    ["919876543210", "9876543210"],
    ["09876543210", "9876543210"],
    ["(987) 654-3210", "9876543210"],
    ["6000000000", "6000000000"],
  ])("accepts %s", (input, out) => {
    expect(normalizeIndianMobile(input)).toBe(out);
  });

  it.each([
    "5876543210", // must start 6 to 9
    "987654321", // 9 digits
    "98765432100", // 11 digits, no leading 0
    "+1 9876543210",
    "98765abcde",
    "",
    "1234567890",
  ])("rejects %s", (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});

describe("normalizePincode", () => {
  it("accepts 6 digits not starting with 0", () => {
    expect(normalizePincode("140126")).toBe("140126");
    expect(normalizePincode(" 140 126 ")).toBe("140126");
  });
  it.each(["040126", "14012", "1401266", "14O126", ""])("rejects %s", (p) => {
    expect(normalizePincode(p)).toBeNull();
  });
});

describe("validateCheckout", () => {
  const good = {
    name: "  Test   Customer ",
    phone: "+91 98765 43210",
    address: " House 1, Test Street, Naya Nangal ",
    pincode: "140126",
    payment: "upi",
  };

  it("returns cleaned values", () => {
    const r = validateCheckout(good);
    expect(r).toEqual({
      ok: true,
      values: {
        name: "Test Customer",
        phone: "9876543210",
        address: "House 1, Test Street, Naya Nangal",
        pincode: "140126",
        payment: "upi",
      },
    });
  });

  it("reports every bad field at once", () => {
    const r = validateCheckout({ name: "A", phone: "123", address: "short", pincode: "000000", payment: "card" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["address", "name", "payment", "phone", "pincode"]);
  });

  it("only allows COD or UPI", () => {
    expect(validateCheckout({ ...good, payment: "cod" }).ok).toBe(true);
    expect(validateCheckout({ ...good, payment: "" }).ok).toBe(false);
  });
});
