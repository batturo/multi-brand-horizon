import type { Metadata } from "next";
import { store } from "@/config/store";
import { ContactLine, TextPage } from "@/components/text-page";

export const metadata: Metadata = {
  title: "Returns and exchanges",
  description: "Returns and exchange rules at Multi Brand Horizon, Naya Nangal.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <TextPage>
      <h1>Returns and exchanges</h1>
      {store.returnsPolicy ? (
        <p className="whitespace-pre-line">{store.returnsPolicy}</p>
      ) : (
        <p>We are finalising our returns and exchange rule. Please ask us before you order and we will tell you.</p>
      )}
      <h2>Check the condition first</h2>
      <p>
        Every item is marked New with tags, Open box like new, or Open box minor marks. Please read the condition and
        look at the photos before you order. If you are not sure, ask us.
      </p>
      <h2>Contact</h2>
      <p>
        <ContactLine />
      </p>
    </TextPage>
  );
}
