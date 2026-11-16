import type { Metadata } from "next";
import { store } from "@/config/store";
import { ContactLine, DraftNotice, TextPage } from "@/components/text-page";
import { gaId, metaPixelId } from "@/lib/analytics/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What information Multi Brand Horizon collects on this website and how it is used.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <TextPage>
      <h1>Privacy</h1>
      <DraftNotice />
      <p>This page explains what information {store.legalName ?? store.name} collects through this website and why.</p>

      <h2>What we collect</h2>
      <ul>
        <li>
          When you place an order: your name, phone number, delivery address, pincode, payment preference and the items
          you ordered.
        </li>
        <li>
          Your cart is saved in your own browser on your phone or computer. We do not see it until you place an
          order.
        </li>
        <li>
          Our hosting provider keeps basic technical logs (such as IP address and pages visited) to run and protect the
          site.
        </li>
      </ul>

      {(gaId() || metaPixelId()) && (
        <>
          <h2>Visit statistics and ads</h2>
          <p>
            We use{" "}
            {[gaId() && "Google Analytics", metaPixelId() && "the Meta (Facebook and Instagram) Pixel"].filter(Boolean).join(" and ")}{" "}
            to count visits and see which items people look at, add to cart and order. These tools use cookies and
            receive the pages you visit, your device and browser details and an approximate location. We do not send them
            your name, phone number or address. You can block these cookies in your browser settings.
          </p>
        </>
      )}

      <h2>How we use it</h2>
      <ul>
        <li>To confirm your order with you, usually on WhatsApp or by phone.</li>
        <li>To deliver your order.</li>
        <li>To keep records we are required to keep by law.</li>
      </ul>
      <p>We do not sell your information. We share it only where needed to deliver your order or when the law requires.</p>

      <h2>Where it is stored</h2>
      <p>
        Orders are stored in our database, run by Supabase. The website is hosted by Vercel. When you message us on
        WhatsApp, WhatsApp&apos;s own privacy policy also applies.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us what information we hold about you, or ask us to correct or delete it, unless we must keep it by
        law. <ContactLine />
      </p>
    </TextPage>
  );
}
