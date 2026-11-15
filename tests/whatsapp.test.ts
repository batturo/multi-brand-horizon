import { describe, expect, it } from "vitest";
import { productEnquiryMessage, waDigits, whatsappLink } from "@/lib/whatsapp";

describe("whatsapp links", () => {
  it("uses digits only for the number", () => {
    expect(waDigits("+91 90416 36322")).toBe("919041636322");
  });
  it("encodes the message", () => {
    const link = whatsappLink("+919041636322", "Hi & bye\nline 2");
    expect(link).toBe("https://wa.me/919041636322?text=Hi%20%26%20bye%0Aline%202");
  });
  it("builds a product question with name, size and link", () => {
    const msg = productEnquiryMessage({
      title: "Slim Fit Jeans",
      brand: "Brand",
      url: "https://example.in/p/slim-fit-jeans",
      size: "32",
    });
    expect(msg).toBe(
      "Hi, I have a question about this item:\nSlim Fit Jeans (Brand)\nSize: 32\nhttps://example.in/p/slim-fit-jeans",
    );
  });
  it("leaves out size when none is chosen", () => {
    expect(productEnquiryMessage({ title: "Belt", brand: "B", url: "u" })).not.toMatch(/Size/);
  });
});
