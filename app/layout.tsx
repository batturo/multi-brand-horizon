import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { store } from "@/config/store";
import { Analytics } from "@/components/analytics";
import { googleSiteVerification } from "@/lib/analytics/config";
import { isNoindexSite, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${store.name}: ${store.tagline}`,
    template: `%s | ${store.name}`,
  },
  description: store.description,
  openGraph: { siteName: store.name, locale: "en_IN", type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  ...(isNoindexSite() ? { robots: { index: false, follow: false } } : {}),
  ...(googleSiteVerification() ? { verification: { google: googleSiteVerification()! } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
