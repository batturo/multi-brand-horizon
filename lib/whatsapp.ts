/**
 * WhatsApp click-to-chat links and the messages we prefill.
 */

/** Digits only, as wa.me expects ("+91 90416 36322" -> "919041636322"). */
export function waDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function productEnquiryMessage(p: {
  title: string;
  brand: string;
  url: string;
  size?: string | null;
}): string {
  const lines = [
    "Hi, I have a question about this item:",
    `${p.title} (${p.brand})`,
  ];
  if (p.size) lines.push(`Size: ${p.size}`);
  lines.push(p.url);
  return lines.join("\n");
}
