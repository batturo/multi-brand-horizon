/**
 * Checkout validation. Used in the browser for instant feedback and again
 * on the server. The database has its own checks as a last line.
 */

export type PaymentPreference = "cod" | "upi";

export const PAYMENT_LABELS: Record<PaymentPreference, string> = {
  cod: "Cash on delivery",
  upi: "UPI",
};

export type CheckoutInput = {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  payment: string;
};

export type CheckoutValues = {
  name: string;
  /** 10 digits, no country code. */
  phone: string;
  address: string;
  pincode: string;
  payment: PaymentPreference;
};

export type FieldErrors = Partial<Record<keyof CheckoutInput, string>>;

/**
 * Indian mobile number to 10 digits. Accepts spaces, dashes, +91, 91 or a
 * leading 0. Returns null if it is not a valid mobile number.
 */
export function normalizeIndianMobile(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** Indian PIN code: 6 digits, first digit 1 to 9. Spaces are allowed ("140 126"). */
export function normalizePincode(input: string): string | null {
  const d = input.replace(/\s/g, "");
  return /^[1-9]\d{5}$/.test(d) ? d : null;
}

export function validateCheckout(
  input: CheckoutInput,
): { ok: true; values: CheckoutValues } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  const address = input.address.trim();
  const phone = normalizeIndianMobile(input.phone ?? "");
  const pincode = normalizePincode(input.pincode ?? "");

  if (name.length < 2) errors.name = "Enter your name.";
  else if (name.length > 100) errors.name = "Name is too long.";

  if (!phone) errors.phone = "Enter a 10 digit mobile number, like 98765 43210.";

  if (address.length < 10) errors.address = "Enter your full address: house, street, area and town.";
  else if (address.length > 500) errors.address = "Address is too long. Keep it under 500 characters.";

  if (!pincode) errors.pincode = "Enter a 6 digit PIN code, like 140126.";

  if (input.payment !== "cod" && input.payment !== "upi") errors.payment = "Choose how you will pay.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    values: { name, phone: phone!, address, pincode: pincode!, payment: input.payment as PaymentPreference },
  };
}
